import { Request, Response } from 'express';
import { Book } from '../models/Book.js';
import { BookCategory } from '../models/BookCategory.js';
import { Assignment } from '../models/Assignment.js';
import { LostDamageLog } from '../models/LostDamageLog.js';
import { Member } from '../models/Member.js';
import { Supplier } from '../models/Supplier.js';
import { Shelf } from '../models/Shelf.js';
import { LibrarySetting } from '../models/LibrarySetting.js';
import { getRequestSchoolId } from '../middleware/auth.js';

function parseAccessionDetails(
  inputAcc: string | undefined,
  defaultPrefix: string,
  defaultSep: string,
  defaultPad: number,
  defaultStart: number
) {
  if (!inputAcc || inputAcc.trim() === '') {
    return {
      prefix: defaultPrefix,
      separator: defaultSep,
      startNum: defaultStart,
      padding: defaultPad,
    };
  }

  const trimmed = inputAcc.trim().toUpperCase();
  // Match prefix, optional separator, and digits e.g. "ACC-01", "LIB_005", "B12"
  const match = trimmed.match(/^([A-Z0-9_-]*?)([_-])?(\d+)$/i);
  if (match) {
    const rawPrefix = match[1] || defaultPrefix;
    const rawSep = match[2] !== undefined ? match[2] : defaultSep;
    const digitsStr = match[3];
    const parsedNum = parseInt(digitsStr, 10);
    const padLen = Math.max(1, digitsStr.length);
    return {
      prefix: rawPrefix,
      separator: rawSep,
      startNum: !isNaN(parsedNum) ? parsedNum : defaultStart,
      padding: padLen,
    };
  }

  return {
    prefix: defaultPrefix,
    separator: defaultSep,
    startNum: defaultStart,
    padding: defaultPad,
  };
}

export async function getNextAccessionNumber(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const settings = await LibrarySetting.findOne(schoolId ? { school: schoolId } : {});
    const prefix = (settings?.accessionPrefix || 'ACC').trim().toUpperCase();
    const startNum = settings?.accessionStartNumber !== undefined ? settings.accessionStartNumber : 1;
    const padding = settings?.accessionPadding || 4;
    const separator = settings?.accessionSeparator !== undefined ? settings.accessionSeparator : '-';

    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSep = separator ? separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const pattern = new RegExp(`^${escapedPrefix}${escapedSep}?(\\d+)`, 'i');

    const matchingBooks = await Book.find(schoolId ? { school: schoolId } : {}).select('accessionNumber copiesList');

    let maxNum = -1;
    for (const b of matchingBooks) {
      // Check primary accessionNumber (could be single ACC-01 or range ACC-01 ~ ACC-05)
      if (b.accessionNumber) {
        const parts = b.accessionNumber.split('~');
        for (const p of parts) {
          const trimmedP = p.trim();
          const m = trimmedP.match(pattern);
          if (m && m[1]) {
            const parsed = parseInt(m[1], 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
      }

      // Check all individual copies in copiesList
      if (Array.isArray(b.copiesList)) {
        for (const copy of b.copiesList) {
          if (copy.accessionNumber) {
            const m = copy.accessionNumber.match(pattern);
            if (m && m[1]) {
              const parsed = parseInt(m[1], 10);
              if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed;
              }
            }
          }
        }
      }
    }

    const nextNum = maxNum >= 0 ? maxNum + 1 : startNum;
    const nextAccessionNumber = `${prefix}${separator}${String(nextNum).padStart(padding, '0')}`;
    return res.json({ success: true, nextAccessionNumber, prefix, startNum, currentMax: maxNum });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate accession number' });
  }
}

export async function getBooks(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { search, category, subCategory, language, status, supplier, shelfLocation } = req.query;
    const query: any = {};
    if (schoolId) {
      query.school = schoolId;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { accessionNumber: regex },
        { 'copiesList.accessionNumber': regex },
        { title: regex },
        { author: regex },
        { publisher: regex },
        { publisherNumber: regex },
        { subCategory: regex },
        { shelfLocation: regex },
      ];
    }

    if (category && typeof category === 'string' && category !== 'all') {
      query.category = category;
    }

    if (subCategory && typeof subCategory === 'string' && subCategory !== 'all') {
      query.subCategory = subCategory;
    }

    if (language && typeof language === 'string' && language !== 'all') {
      query.language = language;
    }

    if (supplier && typeof supplier === 'string' && supplier !== 'all') {
      query.supplier = supplier;
    }

    if (shelfLocation && typeof shelfLocation === 'string' && shelfLocation !== 'all') {
      query.shelfLocation = shelfLocation;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      if (status === 'available') {
        query.availableCopies = { $gt: 0 };
        query.isActive = true;
      } else if (status === 'out_of_stock') {
        query.availableCopies = 0;
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'active') {
        query.isActive = true;
      }
    } else {
      query.isActive = { $ne: false };
    }

    const books = await Book.find(query)
      .populate('category', 'name isActive subCategories')
      .populate('supplier', 'name contactPerson phone email')
      .populate('copiesList.assignedTo', 'name memberId admissionNo className section')
      .sort({ createdAt: -1 });

    // Ensure legacy books without copiesList get auto-migrated copiesList
    for (const book of books) {
      if (!book.copiesList || book.copiesList.length === 0 || book.copiesList.length !== book.totalCopies) {
        const settings = await LibrarySetting.findOne();
        const pfx = settings?.accessionPrefix || 'ACC';
        const sep = settings?.accessionSeparator !== undefined ? settings.accessionSeparator : '-';
        const pad = settings?.accessionPadding || 4;
        const details = parseAccessionDetails(book.accessionNumber, pfx, sep, pad, 1);

        const currentCopies = Array.isArray(book.copiesList) ? [...book.copiesList] : [];
        const needed = book.totalCopies || 1;
        const updatedCopiesList: any[] = [];

        // Check active assignments for this book to correlate
        const activeAssignments = await Assignment.find({
          book: book._id,
          status: { $in: ['assigned', 'overdue'] },
        }).populate('member', 'name memberId admissionNo');

        for (let i = 0; i < needed; i++) {
          const existingCopy = currentCopies[i];
          const curSeq = details.startNum + i;
          const accNum = `${details.prefix}${details.separator}${String(curSeq).padStart(details.padding, '0')}`;

          const assignmentForCopy = activeAssignments[i];

          if (existingCopy && existingCopy.accessionNumber) {
            updatedCopiesList.push({
              copyNumber: i + 1,
              accessionNumber: existingCopy.accessionNumber,
              status: assignmentForCopy ? 'assigned' : existingCopy.status || 'available',
              assignedTo: assignmentForCopy?.member?._id || existingCopy.assignedTo || null,
              assignedToName: assignmentForCopy?.member?.name || existingCopy.assignedToName || '',
              assignedToId: assignmentForCopy?.member?.memberId || (assignmentForCopy?.member as any)?.admissionNo || existingCopy.assignedToId || '',
              assignedDate: assignmentForCopy?.assignedDate || existingCopy.assignedDate || null,
              dueDate: assignmentForCopy?.dueDate || existingCopy.dueDate || null,
              assignmentId: assignmentForCopy?._id || existingCopy.assignmentId || null,
              shelfLocation: book.shelfLocation || '',
            });
          } else {
            updatedCopiesList.push({
              copyNumber: i + 1,
              accessionNumber: accNum,
              status: assignmentForCopy ? 'assigned' : 'available',
              assignedTo: assignmentForCopy?.member?._id || null,
              assignedToName: assignmentForCopy?.member?.name || '',
              assignedToId: assignmentForCopy?.member?.memberId || (assignmentForCopy?.member as any)?.admissionNo || '',
              assignedDate: assignmentForCopy?.assignedDate || null,
              dueDate: assignmentForCopy?.dueDate || null,
              assignmentId: assignmentForCopy?._id || null,
              shelfLocation: book.shelfLocation || '',
            });
          }
        }

        book.copiesList = updatedCopiesList;
        if (needed > 1) {
          book.accessionNumber = `${updatedCopiesList[0].accessionNumber} ~ ${updatedCopiesList[updatedCopiesList.length - 1].accessionNumber}`;
        } else if (updatedCopiesList.length === 1) {
          book.accessionNumber = updatedCopiesList[0].accessionNumber;
        }
        await Book.findByIdAndUpdate(book._id, {
          copiesList: updatedCopiesList,
          accessionNumber: book.accessionNumber,
        });
      }

      // Self-healing: Ensure availableCopies, assignedCopies, etc. perfectly match copiesList status
      if (Array.isArray(book.copiesList) && book.copiesList.length > 0) {
        const availCount = book.copiesList.filter((c: any) => c.status === 'available').length;
        const assignCount = book.copiesList.filter((c: any) => c.status === 'assigned').length;
        const lostCount = book.copiesList.filter((c: any) => c.status === 'lost').length;
        const damagedCount = book.copiesList.filter((c: any) => c.status === 'damaged').length;

        if (
          book.availableCopies !== availCount ||
          book.assignedCopies !== assignCount ||
          book.lostCopies !== lostCount ||
          book.damagedCopies !== damagedCount
        ) {
          book.availableCopies = availCount;
          book.assignedCopies = assignCount;
          book.lostCopies = lostCount;
          book.damagedCopies = damagedCount;
          book.totalCopies = book.copiesList.length;
          await Book.findByIdAndUpdate(book._id, {
            availableCopies: availCount,
            assignedCopies: assignCount,
            lostCopies: lostCount,
            damagedCopies: damagedCount,
            totalCopies: book.copiesList.length,
          });
        }
      }
    }

    return res.json({ success: true, data: books });
  } catch (error: any) {
    console.error('Get books error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch books' });
  }
}

export async function getBookById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const book = await Book.findById(id)
      .populate('category', 'name isActive subCategories')
      .populate('supplier', 'name contactPerson phone email address gstNumber')
      .populate('copiesList.assignedTo', 'name memberId admissionNo className section');
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Also get active assignments count & recent assignments
    const assignments = await Assignment.find({ book: id })
      .populate('member', 'name memberId memberType designation department whatsapp className section')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ success: true, data: { book, assignments } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch book details' });
  }
}

export async function createBook(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    let {
      accessionNumber,
      title,
      author,
      language,
      publisher,
      publisherNumber,
      category,
      subCategory,
      price,
      supplier,
      shelfLocation,
      totalCopies,
      coverImage,
    } = req.body;

    if (!title || !author || !category || totalCopies === undefined) {
      return res.status(400).json({ success: false, message: 'Title, Author, Category and Total Copies are required' });
    }

    const copies = parseInt(totalCopies, 10);
    if (isNaN(copies) || copies <= 0) {
      return res.status(400).json({ success: false, message: 'Available copies / quantity must be greater than 0' });
    }

    // Verify category exists and belongs to school
    const categoryDoc = await BookCategory.findOne(schoolId ? { _id: category, school: schoolId } : { _id: category });
    if (!categoryDoc) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist' });
    }
    if (!categoryDoc.isActive) {
      return res.status(400).json({ success: false, message: 'Selected category is inactive. Please choose an active category.' });
    }

    // If a new subCategory was typed that isn't in category's list, optionally register it
    const trimmedSubCategory = subCategory ? subCategory.trim() : '';
    if (trimmedSubCategory && (!categoryDoc.subCategories || !categoryDoc.subCategories.includes(trimmedSubCategory))) {
      await BookCategory.findByIdAndUpdate(categoryDoc._id, {
        $addToSet: { subCategories: trimmedSubCategory },
      });
    }

    // Fetch settings for accession formatting
    const settings = await LibrarySetting.findOne(schoolId ? { school: schoolId } : {});
    const defaultPrefix = (settings?.accessionPrefix || 'ACC').trim().toUpperCase();
    const defaultStartNum = settings?.accessionStartNumber !== undefined ? settings.accessionStartNumber : 1;
    const defaultPadding = settings?.accessionPadding || 4;
    const defaultSeparator = settings?.accessionSeparator !== undefined ? settings.accessionSeparator : '-';

    let accDetails = parseAccessionDetails(
      accessionNumber,
      defaultPrefix,
      defaultSeparator,
      defaultPadding,
      defaultStartNum
    );

    // If accessionNumber was not provided or is empty, determine the next available number
    if (!accessionNumber || accessionNumber.trim() === '') {
      const escapedPrefix = accDetails.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSep = accDetails.separator ? accDetails.separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
      const pattern = new RegExp(`^${escapedPrefix}${escapedSep}?(\\d+)`, 'i');

      const allBooks = await Book.find(schoolId ? { school: schoolId } : {}).select('accessionNumber copiesList');
      let maxNum = -1;
      for (const b of allBooks) {
        if (b.accessionNumber) {
          const parts = b.accessionNumber.split('~');
          for (const p of parts) {
            const m = p.trim().match(pattern);
            if (m && m[1]) {
              const parsed = parseInt(m[1], 10);
              if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed;
              }
            }
          }
        }
        if (Array.isArray(b.copiesList)) {
          for (const c of b.copiesList) {
            if (c.accessionNumber) {
              const m = c.accessionNumber.match(pattern);
              if (m && m[1]) {
                const parsed = parseInt(m[1], 10);
                if (!isNaN(parsed) && parsed > maxNum) {
                  maxNum = parsed;
                }
              }
            }
          }
        }
      }

      accDetails.startNum = maxNum >= 0 ? maxNum + 1 : defaultStartNum;
    }

    // Optional shelf location
    const trimmedShelf = shelfLocation ? shelfLocation.trim() : '';

    // Generate individual serial / accession numbers for all copies
    const copiesList = [];
    for (let i = 0; i < copies; i++) {
      const curSeq = accDetails.startNum + i;
      const copyAccNum = `${accDetails.prefix}${accDetails.separator}${String(curSeq).padStart(accDetails.padding, '0')}`;

      // Ensure no duplicate accession number exists in DB for this school
      const existingCopy = await Book.findOne({
        ...(schoolId ? { school: schoolId } : {}),
        $or: [
          { accessionNumber: copyAccNum },
          { 'copiesList.accessionNumber': copyAccNum },
        ],
      });
      if (existingCopy) {
        return res.status(400).json({
          success: false,
          message: `Serial / Accession Number "${copyAccNum}" already exists in the catalog for another book. Please choose a different starting number.`,
        });
      }

      copiesList.push({
        copyNumber: i + 1,
        accessionNumber: copyAccNum,
        status: 'available' as const,
        assignedTo: null,
        assignedToName: '',
        assignedToId: '',
        assignedDate: null,
        dueDate: null,
        assignmentId: null,
        shelfLocation: trimmedShelf,
      });
    }

    // Primary display accession number: e.g. "ACC-01 ~ ACC-05" for 5 copies, or "ACC-01" for 1 copy
    const displayAccession =
      copies > 1
        ? `${copiesList[0].accessionNumber} ~ ${copiesList[copiesList.length - 1].accessionNumber}`
        : copiesList[0].accessionNumber;

    // Optional price validation
    const parsedPrice = price !== undefined && price !== '' && !isNaN(Number(price)) ? Math.max(0, Number(price)) : 0;

    // Optional supplier validation
    let validSupplier = null;
    if (supplier && supplier !== 'none' && supplier !== '') {
      const supDoc = await Supplier.findOne(schoolId ? { _id: supplier, school: schoolId } : { _id: supplier });
      if (supDoc) validSupplier = supDoc._id;
    }

    const book = await Book.create({
      school: schoolId,
      accessionNumber: displayAccession,
      title: title.trim(),
      author: author.trim(),
      language: language || 'English',
      publisher: publisher ? publisher.trim() : '',
      publisherNumber: publisherNumber ? publisherNumber.trim() : '',
      category: categoryDoc._id,
      subCategory: trimmedSubCategory,
      price: parsedPrice,
      supplier: validSupplier,
      shelfLocation: trimmedShelf,
      coverImage: coverImage ? coverImage.trim() : '',
      totalCopies: copies,
      availableCopies: copies,
      assignedCopies: 0,
      lostCopies: 0,
      damagedCopies: 0,
      copiesList,
      isActive: true,
    });

    const populatedBook = await Book.findById(book._id)
      .populate('category', 'name isActive subCategories')
      .populate('supplier', 'name contactPerson phone email');
    return res.status(201).json({
      success: true,
      message: `${copies} book ${copies > 1 ? 'copies' : 'copy'} added successfully with individual serial numbers (${displayAccession})!`,
      data: populatedBook,
    });
  } catch (error: any) {
    console.error('Create book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add book' });
  }
}

export async function updateBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      accessionNumber,
      title,
      author,
      language,
      publisher,
      publisherNumber,
      category,
      subCategory,
      price,
      supplier,
      shelfLocation,
      totalCopies,
      coverImage,
      isActive,
    } = req.body;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (accessionNumber && accessionNumber.trim().toUpperCase() !== book.accessionNumber) {
      const existing = await Book.findOne({
        _id: { $ne: id },
        accessionNumber: accessionNumber.trim().toUpperCase(),
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Accession Number "${accessionNumber.trim().toUpperCase()}" is already assigned to another book.` });
      }
      book.accessionNumber = accessionNumber.trim().toUpperCase();
    }

    if (totalCopies !== undefined) {
      const newTotal = parseInt(totalCopies, 10);
      if (isNaN(newTotal) || newTotal < (book.assignedCopies || 0)) {
        return res.status(400).json({
          success: false,
          message: `Total copies cannot be less than currently assigned copies (${book.assignedCopies || 0})`,
        });
      }
      book.totalCopies = newTotal;
      book.availableCopies = Math.max(0, newTotal - (book.assignedCopies || 0) - (book.lostCopies || 0) - (book.damagedCopies || 0));

      // Synchronize copiesList
      book.copiesList = Array.isArray(book.copiesList) ? book.copiesList : [];
      if (newTotal > book.copiesList.length) {
        const settings = await LibrarySetting.findOne();
        const pfx = settings?.accessionPrefix || 'ACC';
        const sep = settings?.accessionSeparator !== undefined ? settings.accessionSeparator : '-';
        const pad = settings?.accessionPadding || 4;
        const details = parseAccessionDetails(book.accessionNumber, pfx, sep, pad, 1);

        // Find highest current sequence in this book's copies
        let lastSeq = details.startNum + book.copiesList.length - 1;
        for (const c of book.copiesList) {
          const m = c.accessionNumber.match(/(\d+)$/);
          if (m && m[1]) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > lastSeq) lastSeq = num;
          }
        }

        const addedCount = newTotal - book.copiesList.length;
        for (let i = 0; i < addedCount; i++) {
          const nextSeq = lastSeq + 1 + i;
          const nextAcc = `${details.prefix}${details.separator}${String(nextSeq).padStart(details.padding, '0')}`;
          book.copiesList.push({
            copyNumber: book.copiesList.length + 1,
            accessionNumber: nextAcc,
            status: 'available',
            assignedTo: null,
            assignedToName: '',
            assignedToId: '',
            assignedDate: null,
            dueDate: null,
            assignmentId: null,
            shelfLocation: book.shelfLocation || '',
          });
        }
      } else if (newTotal < book.copiesList.length) {
        // Only remove available unassigned copies from the end
        let toRemove = book.copiesList.length - newTotal;
        for (let i = book.copiesList.length - 1; i >= 0 && toRemove > 0; i--) {
          if (book.copiesList[i].status === 'available') {
            book.copiesList.splice(i, 1);
            toRemove--;
          }
        }
      }

      if (book.copiesList.length > 1) {
        book.accessionNumber = `${book.copiesList[0].accessionNumber} ~ ${book.copiesList[book.copiesList.length - 1].accessionNumber}`;
      } else if (book.copiesList.length === 1) {
        book.accessionNumber = book.copiesList[0].accessionNumber;
      }
    }

    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (language) book.language = language;
    if (publisher !== undefined) book.publisher = publisher.trim();
    if (publisherNumber !== undefined) book.publisherNumber = publisherNumber.trim();
    if (category) book.category = category;
    if (subCategory !== undefined) book.subCategory = subCategory.trim();
    if (price !== undefined) {
      book.price = price === '' || isNaN(Number(price)) ? 0 : Math.max(0, Number(price));
    }
    if (supplier !== undefined) {
      if (!supplier || supplier === 'none' || supplier === '') {
        book.supplier = null;
      } else {
        book.supplier = supplier;
      }
    }
    if (shelfLocation !== undefined) {
      book.shelfLocation = shelfLocation.trim();
    }
    if (coverImage !== undefined) {
      book.coverImage = coverImage.trim();
    }
    if (typeof isActive === 'boolean') book.isActive = isActive;

    await book.save();
    const populated = await Book.findById(book._id)
      .populate('category', 'name isActive subCategories')
      .populate('supplier', 'name contactPerson phone email');

    return res.json({ success: true, message: 'Book updated successfully', data: populated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update book' });
  }
}

export async function deleteBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Check if currently assigned copies exist
    if (book.assignedCopies > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete book "${book.title}" because ${book.assignedCopies} copy/copies are currently assigned to students/teachers. Please return them first.`,
      });
    }

    await Book.findByIdAndDelete(id);
    return res.json({ success: true, message: `Book "${book.title}" deleted successfully from catalog.` });
  } catch (error: any) {
    console.error('Delete book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete book' });
  }
}

export async function bulkImportBooks(req: Request, res: Response) {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ success: false, message: 'No book records provided for import.' });
    }

    // Pre-fetch all categories for quick resolution or creation
    const existingCategories = await BookCategory.find();
    const categoryMap = new Map<string, any>();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), cat);
      categoryMap.set(cat.name.toLowerCase().trim(), cat);
    });

    // Helper to get or create category
    const getOrCreateCategory = async (catNameOrId?: string) => {
      const defaultName = 'General';
      const searchKey = (catNameOrId || defaultName).trim().toLowerCase();

      if (categoryMap.has(searchKey)) {
        return categoryMap.get(searchKey)._id;
      }

      // Check if it's a valid ID
      if (catNameOrId && categoryMap.has(catNameOrId)) {
        return categoryMap.get(catNameOrId)._id;
      }

      // Create new category dynamically
      const newName = (catNameOrId || defaultName).trim();
      const created = await BookCategory.create({
        name: newName,
        isActive: true,
      });
      categoryMap.set(created._id.toString(), created);
      categoryMap.set(created.name.toLowerCase().trim(), created);
      return created._id;
    };

    const existingBooks = await Book.find({}, 'accessionNumber');
    const existingAccSet = new Set(existingBooks.map((b) => (b.accessionNumber || '').toUpperCase()));

    let nextAccNum = 1;
    const latestBook = await Book.findOne({ accessionNumber: { $ne: '' } }).sort({ createdAt: -1 });
    if (latestBook && latestBook.accessionNumber) {
      const match = latestBook.accessionNumber.match(/ACC-(\d+)/i);
      if (match && match[1]) {
        nextAccNum = parseInt(match[1], 10) + 1;
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const createdBooks: any[] = [];

    for (let index = 0; index < books.length; index++) {
      const item = books[index];
      const rowNumber = index + 1;

      const title = (item.title || item.Title || item['Book Title'] || item['book_title'] || '').toString().trim();
      const author = (item.author || item.Author || item['Author Name'] || item['author_name'] || '').toString().trim();
      
      if (!title) {
        skippedCount++;
        errors.push(`Row #${rowNumber}: Skipped due to missing Book Title.`);
        continue;
      }

      if (!author) {
        skippedCount++;
        errors.push(`Row #${rowNumber} ("${title}"): Skipped due to missing Author.`);
        continue;
      }

      let accessionNumber = (item.accessionNumber || item.AccessionNumber || item['Accession No'] || item['Accession Number'] || item.accNo || '').toString().trim().toUpperCase();
      if (!accessionNumber) {
        while (existingAccSet.has(`ACC-${String(nextAccNum).padStart(4, '0')}`)) {
          nextAccNum++;
        }
        accessionNumber = `ACC-${String(nextAccNum).padStart(4, '0')}`;
        nextAccNum++;
      }
      existingAccSet.add(accessionNumber);

      const rawCategory = item.category || item.Category || item['Category Name'] || item.genre || 'General';
      const categoryId = await getOrCreateCategory(rawCategory);

      let language = (item.language || item.Language || 'English').toString().trim();
      if (!['Hindi', 'English', 'Other'].includes(language)) {
        const langLower = language.toLowerCase();
        if (langLower.includes('hin')) language = 'Hindi';
        else if (langLower.includes('eng')) language = 'English';
        else language = 'Other';
      }

      const rawCopies = item.totalCopies || item.TotalCopies || item.copies || item.Copies || item.Quantity || item.quantity || 5;
      let totalCopies = parseInt(rawCopies, 10);
      if (isNaN(totalCopies) || totalCopies < 1) {
        totalCopies = 1;
      }

      const publisher = (item.publisher || item.Publisher || item['Publisher Name'] || '').toString().trim();
      const publisherNumber = (item.publisherNumber || item.PublisherNumber || item.isbn || item.ISBN || item['Book Number'] || '').toString().trim();
      const subCategory = (item.subCategory || item.SubCategory || item['Sub Category'] || item['Sub-Category'] || item.sub_category || '').toString().trim();
      const shelfLocation = (item.shelfLocation || item.ShelfLocation || item.shelf || item.Shelf || item.rack || item.Rack || item['Shelf No'] || item['Rack No'] || '').toString().trim();

      const rawPrice = item.price || item.Price || item.mrp || item.MRP || item.cost || item.Cost || 0;
      const parsedPrice = !isNaN(Number(rawPrice)) ? Math.max(0, Number(rawPrice)) : 0;

      // Handle supplier lookup / creation if name provided
      let supplierId = null;
      const rawSupplier = (item.supplier || item.Supplier || item.vendor || item.Vendor || item['Supplier Name'] || '').toString().trim();
      if (rawSupplier) {
        let sup = await Supplier.findOne({ name: { $regex: new RegExp(`^${rawSupplier}$`, 'i') } });
        if (!sup) {
          sup = await Supplier.create({ name: rawSupplier, isActive: true });
        }
        supplierId = sup._id;
      }

      const newBook = await Book.create({
        accessionNumber,
        title,
        author,
        category: categoryId,
        subCategory,
        language,
        publisher,
        publisherNumber,
        price: parsedPrice,
        supplier: supplierId,
        shelfLocation,
        totalCopies,
        availableCopies: totalCopies,
        assignedCopies: 0,
        isActive: true,
      });

      createdBooks.push(newBook);
      importedCount++;
    }

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${importedCount} book(s)${skippedCount > 0 ? `, skipped ${skippedCount} invalid rows` : ''}.`,
      importedCount,
      skippedCount,
      errors,
    });
  } catch (error: any) {
    console.error('Bulk import books error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete bulk books import', error: error.message });
  }
}

export async function reportDirectLostDamagedBook(req: Request, res: Response) {
  try {
    const {
      bookId,
      memberId,
      assignmentId,
      source,
      type = 'lost',
      resolutionType = 'cash_recovery',
      replacementAccessionNo,
      copiesCount = 1,
      reason,
      reportedBy,
      fineAmount = 0,
      fineStatus = 'none',
      paymentMethod,
      receiptNo,
    } = req.body;

    if (!bookId) {
      return res.status(400).json({ success: false, message: 'Book selection is required' });
    }

    const isReplacement = resolutionType === 'book_replaced' || type === 'replaced';
    const effectiveType = isReplacement ? 'replaced' : (type === 'damaged' ? 'damaged' : 'lost');

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason or incident description is required' });
    }

    const count = parseInt(copiesCount, 10);
    if (isNaN(count) || count <= 0) {
      return res.status(400).json({ success: false, message: 'Copies count must be at least 1' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    let member = null;
    if (memberId) {
      member = await Member.findById(memberId);
    }

    let assignment = null;
    if (assignmentId) {
      assignment = await Assignment.findById(assignmentId);
    }
    if (!assignment && memberId && bookId) {
      assignment = await Assignment.findOne({
        member: memberId,
        book: bookId,
        status: { $in: ['assigned', 'overdue'] },
      });
    }

    const fineNum = Math.max(0, parseFloat(fineAmount) || 0);
    const normalizedFineStatus = fineNum === 0 ? 'none' : (fineStatus === 'paid' ? 'paid' : 'pending');

    // Case 1: Student / Borrower gave a REPLACEMENT COPY of the book (New Book provided)
    if (isReplacement) {
      if (assignment) {
        assignment.status = 'returned';
        assignment.lostOrDamaged = 'replaced';
        assignment.returnedDate = new Date();
        assignment.fineAmount = fineNum;
        assignment.fineStatus = normalizedFineStatus;
        if (receiptNo) assignment.receiptNo = receiptNo.trim();
        if (paymentMethod) assignment.paymentMethod = paymentMethod.trim();
        assignment.remarks = `Book copy replaced with a new copy by student/borrower.${replacementAccessionNo ? ` (New Acc: ${replacementAccessionNo.trim()})` : ''} ${reason.trim()}`.trim();
        await assignment.save();

        // Update copiesList: Mark copy available and update accessionNumber if replacement is provided
        if (Array.isArray(book.copiesList)) {
          const copy = book.copiesList.find(
            (c) =>
              (c.assignmentId && c.assignmentId.toString() === assignment._id.toString()) ||
              (assignment.accessionNumber && c.accessionNumber === assignment.accessionNumber) ||
              (assignment.copyNumber && c.copyNumber === assignment.copyNumber)
          );
          if (copy) {
            if (replacementAccessionNo && replacementAccessionNo.trim()) {
              copy.accessionNumber = replacementAccessionNo.trim();
            }
            copy.status = 'available';
            copy.assignedTo = null;
            copy.assignedToName = '';
            copy.assignedToId = '';
            copy.assignedDate = null;
            copy.dueDate = null;
            copy.assignmentId = null;
          }

          // Recalculate book stock counters from copiesList for 100% accuracy
          book.assignedCopies = book.copiesList.filter((c) => c.status === 'assigned').length;
          book.availableCopies = book.copiesList.filter((c) => c.status === 'available').length;
          book.lostCopies = book.copiesList.filter((c) => c.status === 'lost').length;
          book.damagedCopies = book.copiesList.filter((c) => c.status === 'damaged').length;
          book.totalCopies = book.copiesList.length;
        } else {
          book.assignedCopies = Math.max(0, (book.assignedCopies || 0) - 1);
          book.availableCopies = Math.max(0, (book.totalCopies || 0) - book.assignedCopies);
        }
        await book.save();
      }

      const log = await LostDamageLog.create({
        book: book._id,
        assignment: assignment ? assignment._id : undefined,
        member: assignment?.member || (member ? member._id : undefined),
        type: 'replaced',
        resolutionType: 'book_replaced',
        replacementAccessionNo: replacementAccessionNo ? replacementAccessionNo.trim() : undefined,
        copiesCount: count,
        fineAmount: fineNum,
        fineStatus: normalizedFineStatus,
        paymentMethod: paymentMethod ? paymentMethod.trim() : undefined,
        receiptNo: receiptNo ? receiptNo.trim() : undefined,
        reason: reason.trim(),
        reportedBy: reportedBy || 'Admin / Librarian',
        source: assignment || member ? 'assignment' : 'inventory',
        stockDeducted: false,
      });

      const populatedLog = await LostDamageLog.findById(log._id)
        .populate('book', 'title author accessionNumber language category totalCopies availableCopies price')
        .populate('member', 'name memberId memberType className section department designation whatsapp')
        .populate('assignment');

      return res.status(201).json({
        success: true,
        message: `Replacement copy recorded for "${book.title}". Library stock is preserved and student loan settled.`,
        data: {
          log: populatedLog,
          book,
        },
      });
    }

    // Case 2: Cash Recovery / Stock Deduction for Lost or Damaged (with loan)
    if (assignment) {
      assignment.status = effectiveType;
      assignment.lostOrDamaged = effectiveType;
      assignment.damageOrLostFine = fineNum;
      assignment.damageOrLostReason = reason.trim();
      assignment.damageOrLostDate = new Date();
      assignment.fineAmount = fineNum;
      assignment.fineStatus = normalizedFineStatus;
      if (receiptNo) assignment.receiptNo = receiptNo.trim();
      if (paymentMethod) assignment.paymentMethod = paymentMethod.trim();
      assignment.remarks = `Condition: ${effectiveType.toUpperCase()} (${reason.trim()})`;
      await assignment.save();

      // Update copiesList: Mark copy as lost or damaged and release assignment
      if (Array.isArray(book.copiesList)) {
        const copy = book.copiesList.find(
          (c) =>
            (c.assignmentId && c.assignmentId.toString() === assignment._id.toString()) ||
            (assignment.accessionNumber && c.accessionNumber === assignment.accessionNumber) ||
            (assignment.copyNumber && c.copyNumber === assignment.copyNumber)
        );
        if (copy) {
          copy.status = (effectiveType === 'damaged' ? 'damaged' : 'lost') as any;
          copy.assignedTo = null;
          copy.assignedToName = '';
          copy.assignedToId = '';
          copy.assignedDate = null;
          copy.dueDate = null;
          copy.assignmentId = null;
        }

        // Recalculate book stock counters from copiesList for 100% accuracy
        book.assignedCopies = book.copiesList.filter((c) => c.status === 'assigned').length;
        book.availableCopies = book.copiesList.filter((c) => c.status === 'available').length;
        book.lostCopies = book.copiesList.filter((c) => c.status === 'lost').length;
        book.damagedCopies = book.copiesList.filter((c) => c.status === 'damaged').length;
        book.totalCopies = book.copiesList.length;
      } else {
        book.assignedCopies = Math.max(0, (book.assignedCopies || 0) - 1);
        if (effectiveType === 'lost') {
          book.lostCopies = (book.lostCopies || 0) + 1;
        } else {
          book.damagedCopies = (book.damagedCopies || 0) + 1;
        }
        book.totalCopies = Math.max(0, (book.totalCopies || 1) - 1);
        book.availableCopies = Math.max(0, book.totalCopies - book.assignedCopies);
      }
      await book.save();

      const log = await LostDamageLog.create({
        book: book._id,
        assignment: assignment._id,
        member: assignment.member,
        type: effectiveType,
        resolutionType: 'cash_recovery',
        copiesCount: 1,
        fineAmount: fineNum,
        fineStatus: normalizedFineStatus,
        paymentMethod: paymentMethod ? paymentMethod.trim() : undefined,
        receiptNo: receiptNo ? receiptNo.trim() : undefined,
        reason: reason.trim(),
        reportedBy: reportedBy || 'Admin / Librarian',
        source: 'assignment',
        stockDeducted: true,
      });

      const populatedLog = await LostDamageLog.findById(log._id)
        .populate('book', 'title author accessionNumber language category totalCopies availableCopies price')
        .populate('member', 'name memberId memberType className section department designation whatsapp')
        .populate('assignment');

      return res.status(201).json({
        success: true,
        message: `Successfully recorded ${effectiveType} book for ${populatedLog?.member?.name || 'borrower'}. Stock and loan updated.`,
        data: {
          log: populatedLog,
          book,
        },
      });
    }

    // Case 3: Direct report from library catalog / shelf audit
    if (book.availableCopies < count) {
      return res.status(400).json({
        success: false,
        message: `Cannot report ${count} ${effectiveType} copy/copies. Only ${book.availableCopies} unassigned copy/copies are available in library stock.`,
      });
    }

    // Deduct from availableCopies and totalCopies, track in lostCopies/damagedCopies
    book.availableCopies = Math.max(0, book.availableCopies - count);
    book.totalCopies = Math.max(0, book.totalCopies - count);
    if (effectiveType === 'lost') {
      book.lostCopies = (book.lostCopies || 0) + count;
    } else {
      book.damagedCopies = (book.damagedCopies || 0) + count;
    }

    // Update copiesList for unassigned inventory
    if (Array.isArray(book.copiesList)) {
      let markedCount = 0;
      for (const copy of book.copiesList) {
        if (copy.status === 'available' && markedCount < count) {
          copy.status = (effectiveType === 'damaged' ? 'damaged' : 'lost') as any;
          copy.assignedTo = null;
          copy.assignedToName = '';
          copy.assignedToId = '';
          copy.assignedDate = null;
          copy.dueDate = null;
          copy.assignmentId = null;
          markedCount++;
        }
      }
    }
    await book.save();

    const isMemberSource = Boolean(member || source === 'assignment');

    const log = await LostDamageLog.create({
      book: book._id,
      member: member ? member._id : undefined,
      type: effectiveType,
      resolutionType: 'cash_recovery',
      copiesCount: count,
      fineAmount: fineNum,
      fineStatus: normalizedFineStatus,
      paymentMethod: paymentMethod ? paymentMethod.trim() : undefined,
      receiptNo: receiptNo ? receiptNo.trim() : undefined,
      reason: reason.trim(),
      reportedBy: reportedBy || (member ? `Reported for ${member.name}` : 'Admin / Librarian'),
      source: isMemberSource ? 'assignment' : 'inventory',
      stockDeducted: true,
    });

    const populatedLog = await LostDamageLog.findById(log._id)
      .populate('book', 'title author accessionNumber language category totalCopies availableCopies price')
      .populate('member', 'name memberId memberType className section department designation whatsapp');

    const studentInfo = member ? ` for student ${member.name} (${member.className || member.memberId})` : '';

    return res.status(201).json({
      success: true,
      message: `Successfully recorded ${count} ${effectiveType} copy/copies of "${book.title}"${studentInfo}. Library stock updated.`,
      data: {
        log: populatedLog,
        book,
      },
    });
  } catch (error: any) {
    console.error('Report direct lost/damaged error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record lost/damaged book' });
  }
}

export async function updateLostDamageLog(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { memberId, reason, fineAmount, fineStatus, paymentMethod, receiptNo, reportedBy } = req.body;

    const log = await LostDamageLog.findById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Lost/Damaged record not found' });
    }

    if (memberId !== undefined) {
      if (memberId && memberId !== 'none') {
        const member = await Member.findById(memberId);
        if (member) {
          log.member = member._id;
          log.source = 'assignment';
        }
      } else {
        log.member = undefined;
        log.source = 'inventory';
      }
    }

    if (reason !== undefined) log.reason = reason.trim();
    if (fineAmount !== undefined) log.fineAmount = Math.max(0, parseFloat(fineAmount) || 0);
    if (fineStatus !== undefined) log.fineStatus = fineStatus;
    if (paymentMethod !== undefined) log.paymentMethod = paymentMethod.trim();
    if (receiptNo !== undefined) log.receiptNo = receiptNo.trim();
    if (reportedBy !== undefined) log.reportedBy = reportedBy.trim();

    // Sync linked assignment fine status if exists
    if (log.assignment) {
      const assignment = await Assignment.findById(log.assignment);
      if (assignment) {
        if (fineStatus !== undefined) assignment.fineStatus = fineStatus;
        if (fineAmount !== undefined) assignment.fineAmount = log.fineAmount;
        if (paymentMethod !== undefined) assignment.paymentMethod = log.paymentMethod;
        if (receiptNo !== undefined) assignment.receiptNo = log.receiptNo;
        await assignment.save();
      }
    }

    await log.save();

    const updatedLog = await LostDamageLog.findById(log._id)
      .populate('book', 'title author accessionNumber language category totalCopies availableCopies')
      .populate('member', 'name memberId memberType className section department designation whatsapp')
      .populate('assignment');

    return res.json({
      success: true,
      message: 'Record updated successfully',
      data: updatedLog,
    });
  } catch (error: any) {
    console.error('Update lost damage log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lost/damaged record' });
  }
}

export async function deleteLostDamageLog(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const log = await LostDamageLog.findById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Lost/Damaged record not found' });
    }

    // Restore book counts if stock was deducted
    if (log.stockDeducted && log.book) {
      const book = await Book.findById(log.book);
      if (book) {
        const count = log.copiesCount || 1;
        book.totalCopies = (book.totalCopies || 0) + count;
        book.availableCopies = (book.availableCopies || 0) + count;
        if (log.type === 'lost') {
          book.lostCopies = Math.max(0, (book.lostCopies || 0) - count);
        } else {
          book.damagedCopies = Math.max(0, (book.damagedCopies || 0) - count);
        }
        await book.save();
      }
    }

    // If it was linked to an assignment, restore assignment status
    if (log.assignment) {
      const assignment = await Assignment.findById(log.assignment);
      if (assignment) {
        assignment.status = 'assigned';
        assignment.lostOrDamaged = null;
        assignment.damageOrLostFine = 0;
        assignment.damageOrLostReason = '';
        await assignment.save();
      }
    }

    await LostDamageLog.findByIdAndDelete(id);

    return res.json({ success: true, message: 'Lost/Damaged record deleted and stock restored.' });
  } catch (error: any) {
    console.error('Delete lost damage log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
}

export async function getLostDamageLogs(req: Request, res: Response) {
  try {
    const { type, bookId, search } = req.query;
    const query: any = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (bookId && bookId !== 'all') {
      query.book = bookId;
    }

    // Auto-repair existing unlinked logs for members/books
    const unlinkedLogs = await LostDamageLog.find({ member: { $ne: null }, book: { $ne: null } });
    for (const l of unlinkedLogs) {
      const activeAssign = await Assignment.findOne({
        member: l.member,
        book: l.book,
        status: { $in: ['assigned', 'overdue'] },
      });
      if (activeAssign) {
        l.assignment = activeAssign._id;
        await l.save();

        const b = await Book.findById(l.book);
        if (b && Array.isArray(b.copiesList)) {
          const copy = b.copiesList.find(
            (c: any) =>
              (c.assignmentId && c.assignmentId.toString() === activeAssign._id.toString()) ||
              (c.assignedTo && c.assignedTo.toString() === l.member.toString()) ||
              (activeAssign.accessionNumber && c.accessionNumber === activeAssign.accessionNumber)
          );

          if (l.type === 'replaced' || l.resolutionType === 'book_replaced') {
            activeAssign.status = 'returned';
            activeAssign.lostOrDamaged = 'replaced';
            await activeAssign.save();

            if (copy) {
              if (l.replacementAccessionNo) copy.accessionNumber = l.replacementAccessionNo.trim();
              copy.status = 'available';
              copy.assignedTo = null;
              copy.assignedToName = '';
              copy.assignedToId = '';
              copy.assignedDate = null;
              copy.dueDate = null;
              copy.assignmentId = null;
            }
          } else {
            activeAssign.status = (l.type === 'damaged' ? 'damaged' : 'lost') as any;
            activeAssign.lostOrDamaged = (l.type === 'damaged' ? 'damaged' : 'lost') as any;
            await activeAssign.save();

            if (copy) {
              copy.status = (l.type === 'damaged' ? 'damaged' : 'lost') as any;
              copy.assignedTo = null;
              copy.assignedToName = '';
              copy.assignedToId = '';
              copy.assignedDate = null;
              copy.dueDate = null;
              copy.assignmentId = null;
            }
          }

          b.assignedCopies = b.copiesList.filter((c: any) => c.status === 'assigned').length;
          b.availableCopies = b.copiesList.filter((c: any) => c.status === 'available').length;
          b.lostCopies = b.copiesList.filter((c: any) => c.status === 'lost').length;
          b.damagedCopies = b.copiesList.filter((c: any) => c.status === 'damaged').length;
          b.totalCopies = b.copiesList.length;
          await b.save();
        }
      }
    }

    let logs = await LostDamageLog.find(query)
      .populate('book', 'title author accessionNumber language category totalCopies availableCopies')
      .populate('member', 'name memberId memberType className section department designation')
      .populate('assignment')
      .sort({ createdAt: -1 });

    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = search.toLowerCase().trim();
      logs = logs.filter((l) => {
        const title = (l.book as any)?.title?.toLowerCase() || '';
        const author = (l.book as any)?.author?.toLowerCase() || '';
        const acc = (l.book as any)?.accessionNumber?.toLowerCase() || '';
        const memberName = (l.member as any)?.name?.toLowerCase() || '';
        const memberId = (l.member as any)?.memberId?.toLowerCase() || '';
        const reason = l.reason?.toLowerCase() || '';
        return title.includes(s) || author.includes(s) || acc.includes(s) || memberName.includes(s) || memberId.includes(s) || reason.includes(s);
      });
    }

    return res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Get lost damage logs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lost/damaged book records' });
  }
}

export async function getLostDamageStats(req: Request, res: Response) {
  try {
    const logs = await LostDamageLog.find();
    let totalLostCopies = 0;
    let totalDamagedCopies = 0;
    let totalFinesAssessed = 0;
    let totalFinesCollected = 0;

    logs.forEach((log) => {
      if (log.type === 'lost') {
        totalLostCopies += (log.copiesCount || 1);
      } else if (log.type === 'damaged') {
        totalDamagedCopies += (log.copiesCount || 1);
      }
      totalFinesAssessed += (log.fineAmount || 0);
      if (log.fineStatus === 'paid') {
        totalFinesCollected += (log.fineAmount || 0);
      }
    });

    return res.json({
      success: true,
      data: {
        totalLostCopies,
        totalDamagedCopies,
        totalIncidents: logs.length,
        totalFinesAssessed,
        totalFinesCollected,
        pendingFines: Math.max(0, totalFinesAssessed - totalFinesCollected),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to calculate lost/damaged stats' });
  }
}

// GET /api/books/analytics
export async function getBookAnalytics(req: Request, res: Response) {
  try {
    const books = await Book.find().populate('category', 'name').populate('supplier', 'name');

    let totalTitles = books.length;
    let totalCopies = 0;
    let availableCopies = 0;
    let assignedCopies = 0;
    let lostCopies = 0;
    let damagedCopies = 0;
    let totalCatalogValuation = 0;
    let availableStockValuation = 0;

    const supplierMap = new Map<string, { name: string; titleCount: number; totalCopies: number; availableCopies: number; totalSpend: number }>();
    const shelfMap = new Map<string, { name: string; titleCount: number; totalCopies: number; availableCopies: number; totalValuation: number }>();
    const categoryMap = new Map<string, { name: string; titleCount: number; totalCopies: number; availableCopies: number; totalValuation: number }>();
    const languageMap = new Map<string, { name: string; titleCount: number; totalCopies: number; availableCopies: number; totalValuation: number }>();

    // Price brackets
    let priceUnder200 = 0;
    let price200to500 = 0;
    let price500to1000 = 0;
    let priceAbove1000 = 0;

    books.forEach((b) => {
      const p = b.price || 0;
      const tc = b.totalCopies || 0;
      const ac = b.availableCopies || 0;
      const asc = b.assignedCopies || 0;
      const lc = b.lostCopies || 0;
      const dc = b.damagedCopies || 0;

      totalCopies += tc;
      availableCopies += ac;
      assignedCopies += asc;
      lostCopies += lc;
      damagedCopies += dc;

      const titleValuation = p * tc;
      const availValuation = p * ac;
      totalCatalogValuation += titleValuation;
      availableStockValuation += availValuation;

      // Price ranges
      if (p < 200) priceUnder200++;
      else if (p <= 500) price200to500++;
      else if (p <= 1000) price500to1000++;
      else priceAbove1000++;

      // Supplier distribution
      const supName = (b.supplier as any)?.name || 'Direct / Unspecified';
      const supKey = (b.supplier as any)?._id?.toString() || 'unspecified';
      if (!supplierMap.has(supKey)) {
        supplierMap.set(supKey, { name: supName, titleCount: 0, totalCopies: 0, availableCopies: 0, totalSpend: 0 });
      }
      const supEntry = supplierMap.get(supKey)!;
      supEntry.titleCount += 1;
      supEntry.totalCopies += tc;
      supEntry.availableCopies += ac;
      supEntry.totalSpend += titleValuation;

      // Shelf distribution
      const shelfName = b.shelfLocation ? b.shelfLocation.trim() : 'Unassigned Shelf';
      if (!shelfMap.has(shelfName)) {
        shelfMap.set(shelfName, { name: shelfName, titleCount: 0, totalCopies: 0, availableCopies: 0, totalValuation: 0 });
      }
      const shelfEntry = shelfMap.get(shelfName)!;
      shelfEntry.titleCount += 1;
      shelfEntry.totalCopies += tc;
      shelfEntry.availableCopies += ac;
      shelfEntry.totalValuation += titleValuation;

      // Category distribution
      const catName = (b.category as any)?.name || 'Uncategorized';
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, { name: catName, titleCount: 0, totalCopies: 0, availableCopies: 0, totalValuation: 0 });
      }
      const catEntry = categoryMap.get(catName)!;
      catEntry.titleCount += 1;
      catEntry.totalCopies += tc;
      catEntry.availableCopies += ac;
      catEntry.totalValuation += titleValuation;

      // Language distribution
      const langName = b.language || 'English';
      if (!languageMap.has(langName)) {
        languageMap.set(langName, { name: langName, titleCount: 0, totalCopies: 0, availableCopies: 0, totalValuation: 0 });
      }
      const langEntry = languageMap.get(langName)!;
      langEntry.titleCount += 1;
      langEntry.totalCopies += tc;
      langEntry.availableCopies += ac;
      langEntry.totalValuation += titleValuation;
    });

    const averagePrice = totalCopies > 0 ? Math.round(totalCatalogValuation / totalCopies) : 0;
    const availabilityRate = totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0;

    // Top expensive books
    const topExpensiveBooks = [...books]
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 5)
      .map((b) => ({
        id: b._id,
        title: b.title,
        author: b.author,
        price: b.price || 0,
        totalCopies: b.totalCopies,
        availableCopies: b.availableCopies,
        shelfLocation: b.shelfLocation || 'Unassigned',
        supplierName: (b.supplier as any)?.name || '—',
      }));

    return res.json({
      success: true,
      data: {
        summary: {
          totalTitles,
          totalCopies,
          availableCopies,
          assignedCopies,
          lostCopies,
          damagedCopies,
          availabilityRate,
          totalCatalogValuation,
          availableStockValuation,
          averagePrice,
        },
        suppliers: Array.from(supplierMap.values()).sort((a, b) => b.totalCopies - a.totalCopies),
        shelves: Array.from(shelfMap.values()).sort((a, b) => b.totalCopies - a.totalCopies),
        categories: Array.from(categoryMap.values()).sort((a, b) => b.totalCopies - a.totalCopies),
        languages: Array.from(languageMap.values()).sort((a, b) => b.totalCopies - a.totalCopies),
        priceDistribution: [
          { range: 'Under ₹200', count: priceUnder200 },
          { range: '₹200 - ₹500', count: price200to500 },
          { range: '₹500 - ₹1000', count: price500to1000 },
          { range: '₹1000+', count: priceAbove1000 },
        ],
        topExpensiveBooks,
      },
    });
  } catch (error: any) {
    console.error('Book analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate book analytics' });
  }
}



