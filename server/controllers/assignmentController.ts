import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { LibrarySetting } from '../models/LibrarySetting.js';
import { LostDamageLog } from '../models/LostDamageLog.js';
import { calculateFineBreakdown } from '../services/fineCalculator.js';
import { getRequestSchoolId } from '../middleware/auth.js';

export async function getAssignments(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { status, memberId, bookId, categoryId, search, fromDate, toDate } = req.query;
    const query: any = {};
    if (schoolId) query.school = schoolId;

    if (memberId && memberId !== 'all') {
      const memberIdStr = String(memberId);
      if (mongoose.isValidObjectId(memberIdStr)) {
        query.member = memberIdStr;
      } else {
        const foundMember = await Member.findOne({ memberId: memberIdStr });
        if (foundMember) {
          query.member = foundMember._id;
        } else {
          query.member = memberIdStr;
        }
      }
    }

    if (bookId && bookId !== 'all') {
      query.book = bookId;
    }

    if (fromDate || toDate) {
      query.assignedDate = {};
      if (fromDate) query.assignedDate.$gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        query.assignedDate.$lte = to;
      }
    }

    const setting = await LibrarySetting.findOne() || {
      issueDuration: 14,
      finePerDay: 2,
      fineRules: [],
      maxBooksPerMember: 3,
    };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let assignments = await Assignment.find(query)
      .populate({
        path: 'book',
        select: 'title author accessionNumber language category publisher publisherNumber totalCopies availableCopies assignedCopies',
        populate: { path: 'category', select: 'name' },
      })
      .populate('member', 'name memberId memberType designation department admissionNo whatsapp email className section status')
      .sort({ assignedDate: -1 });

    // Filter by category if requested
    if (categoryId && categoryId !== 'all') {
      assignments = assignments.filter(
        (a) => a.book && a.book.category && (a.book.category._id?.toString() === categoryId || a.book.category.toString() === categoryId)
      );
    }

    // Filter by text search if provided (student/teacher name, member id, admission no, book title, author, accession no, copy accession no)
    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = search.toLowerCase().trim();
      assignments = assignments.filter((a) => {
        const studentName = a.member?.name?.toLowerCase() || '';
        const memberIdStr = a.member?.memberId?.toLowerCase() || '';
        const admissionNoStr = (a.member as any)?.admissionNo?.toLowerCase() || '';
        const bookTitle = a.book?.title?.toLowerCase() || '';
        const bookAuthor = a.book?.author?.toLowerCase() || '';
        const accessionNoStr = (a.book as any)?.accessionNumber?.toLowerCase() || '';
        const assignedCopyAccStr = (a as any).accessionNumber?.toLowerCase() || '';
        return (
          studentName.includes(s) ||
          memberIdStr.includes(s) ||
          admissionNoStr.includes(s) ||
          bookTitle.includes(s) ||
          bookAuthor.includes(s) ||
          accessionNoStr.includes(s) ||
          assignedCopyAccStr.includes(s)
        );
      });
    }

    const threeDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59, 999);

    // Process live status, late days, and calculated fines with effective-date slabs
    const processedAssignments = assignments.map((a) => {
      const aObj = a.toObject();
      const dueDate = new Date(a.dueDate);
      const isLost = a.status === 'lost' || a.lostOrDamaged === 'lost';
      const isDamaged = a.status === 'damaged' || a.lostOrDamaged === 'damaged';
      const isReturned = (a.status === 'returned' || !!a.returnedDate) && !isLost && !isDamaged;

      let calculatedStatus = a.status;
      let lateDays = 0;
      let currentFine = a.fineAmount || 0;
      let fineBreakdown = a.fineBreakdown || [];

      if (isLost) {
        calculatedStatus = 'lost';
        currentFine = a.fineAmount || a.damageOrLostFine || 0;
      } else if (isDamaged) {
        calculatedStatus = 'damaged';
        currentFine = a.fineAmount || a.damageOrLostFine || 0;
      } else if (!isReturned) {
        if (dueDate < todayStart) {
          calculatedStatus = 'overdue';
          const fineCalc = calculateFineBreakdown(dueDate, now, setting);
          lateDays = fineCalc.lateDays;
          fineBreakdown = fineCalc.breakdown;

          // If fine has not already been marked as paid or none, calculate live fine
          if (a.fineStatus !== 'paid' && a.fineStatus !== 'none') {
            currentFine = fineCalc.fineAmount;
          } else {
            currentFine = a.fineAmount || 0;
          }
        } else if (dueDate >= todayStart && dueDate <= todayEnd) {
          calculatedStatus = 'due_today' as any;
        } else {
          calculatedStatus = 'assigned';
        }
      } else {
        calculatedStatus = 'returned';
        if (a.returnedDate && new Date(a.returnedDate) > dueDate) {
          const fineCalc = calculateFineBreakdown(dueDate, a.returnedDate, setting);
          lateDays = fineCalc.lateDays;
          if (!fineBreakdown || fineBreakdown.length === 0) {
            fineBreakdown = fineCalc.breakdown;
          }
        }
      }

      return {
        ...aObj,
        calculatedStatus,
        lateDays,
        currentFine,
        fineBreakdown,
        isLost,
        isDamaged,
        isDueToday: !isReturned && !isLost && !isDamaged && dueDate >= todayStart && dueDate <= todayEnd,
        isDueSoon: !isReturned && !isLost && !isDamaged && dueDate >= todayStart && dueDate <= threeDaysLater,
        isOverdue: !isReturned && !isLost && !isDamaged && dueDate < todayStart,
      };
    });

    // Apply status filter if requested
    let finalResult = processedAssignments;
    if (status && status !== 'all') {
      if (status === 'assigned') {
        finalResult = processedAssignments.filter((a) => a.status !== 'returned' && a.status !== 'lost' && a.status !== 'damaged');
      } else if (status === 'returned') {
        finalResult = processedAssignments.filter((a) => a.status === 'returned');
      } else if (status === 'overdue') {
        finalResult = processedAssignments.filter((a) => a.isOverdue);
      } else if (status === 'due_today') {
        finalResult = processedAssignments.filter((a) => a.isDueToday);
      } else if (status === 'due_soon') {
        finalResult = processedAssignments.filter((a) => a.isDueSoon);
      } else if (status === 'lost') {
        finalResult = processedAssignments.filter((a) => a.isLost);
      } else if (status === 'damaged') {
        finalResult = processedAssignments.filter((a) => a.isDamaged);
      } else if (status === 'lost_damaged') {
        finalResult = processedAssignments.filter((a) => a.isLost || a.isDamaged);
      } else if (status === 'pending_fine') {
        finalResult = processedAssignments.filter((a) => a.fineStatus === 'pending' || (a.isOverdue && a.currentFine > 0));
      }
    }

    return res.json({ success: true, data: finalResult });
  } catch (error: any) {
    console.error('Get assignments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
}

export async function getAssignmentById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id)
      .populate({
        path: 'book',
        populate: { path: 'category', select: 'name' },
      })
      .populate('member');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    return res.json({ success: true, data: assignment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assignment details' });
  }
}

export async function createAssignment(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { memberId, bookId, copyNumber, accessionNumber, assignedDate, dueDate, remarks } = req.body;

    if (!memberId || !bookId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Member, Book, and Due Date are required to assign a book',
      });
    }

    // Verify Member
    const member = await Member.findOne(schoolId ? { _id: memberId, school: schoolId } : { _id: memberId });
    if (!member) {
      return res.status(400).json({ success: false, message: 'Member not found' });
    }
    if (member.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign book to an inactive member. Please activate the student record first.',
      });
    }

    // Check maximum books limit per member
    const setting = await LibrarySetting.findOne(schoolId ? { school: schoolId } : {});
    const maxLimit = setting?.maxBooksPerMember || 3;
    const activeBorrowCount = await Assignment.countDocuments({
      member: memberId,
      status: { $in: ['assigned', 'overdue'] },
      ...(schoolId ? { school: schoolId } : {}),
    });

    if (activeBorrowCount >= maxLimit) {
      const recipientTypeStr = member.memberType === 'teacher' ? 'Teacher' : 'Student';
      return res.status(400).json({
        success: false,
        message: `Maximum limit reached: ${recipientTypeStr} "${member.name}" (${member.memberId}) already has ${activeBorrowCount} active book(s) issued. Maximum allowed limit is ${maxLimit} book(s). Please return a book first.`,
      });
    }

    // Verify Book availability
    const book = await Book.findOne(schoolId ? { _id: bookId, school: schoolId } : { _id: bookId });
    if (!book) {
      return res.status(400).json({ success: false, message: 'Book not found' });
    }
    if (!book.isActive) {
      return res.status(400).json({ success: false, message: 'This book title is currently inactive in the catalog.' });
    }
    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: `No copies available for "${book.title}". All copies are currently assigned.`,
      });
    }

    // Ensure copiesList exists on book
    if (!Array.isArray(book.copiesList) || book.copiesList.length === 0) {
      const total = book.totalCopies || 1;
      const copiesList = [];
      for (let i = 0; i < total; i++) {
        const curAcc = total > 1 ? `${book.accessionNumber.split('~')[0]?.trim() || 'ACC'}-${i + 1}` : book.accessionNumber;
        copiesList.push({
          copyNumber: i + 1,
          accessionNumber: curAcc,
          status: 'available' as const,
          assignedTo: null,
          assignedToName: '',
          assignedToId: '',
          assignedDate: null,
          dueDate: null,
          assignmentId: null,
          shelfLocation: book.shelfLocation || '',
        });
      }
      book.copiesList = copiesList;
    }

    // Find requested copy or first available copy
    let targetCopy = null;
    if (accessionNumber) {
      targetCopy = book.copiesList.find(
        (c) => c.accessionNumber.toUpperCase() === accessionNumber.trim().toUpperCase()
      );
      if (!targetCopy) {
        return res.status(400).json({
          success: false,
          message: `Copy with Serial No. "${accessionNumber}" not found for book "${book.title}".`,
        });
      }
      if (targetCopy.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Copy with Serial No. "${targetCopy.accessionNumber}" is currently ${targetCopy.status.toUpperCase()} (assigned to ${targetCopy.assignedToName || 'another student'}). Please select an available copy.`,
        });
      }
    } else if (copyNumber !== undefined && copyNumber !== null && copyNumber !== '') {
      const cNum = parseInt(copyNumber, 10);
      targetCopy = book.copiesList.find((c) => c.copyNumber === cNum);
      if (!targetCopy) {
        return res.status(400).json({
          success: false,
          message: `Copy #${copyNumber} not found for book "${book.title}".`,
        });
      }
      if (targetCopy.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Copy #${targetCopy.copyNumber} (${targetCopy.accessionNumber}) is currently ${targetCopy.status.toUpperCase()}.`,
        });
      }
    } else {
      // Pick first available copy
      targetCopy = book.copiesList.find((c) => c.status === 'available');
      if (!targetCopy) {
        return res.status(400).json({
          success: false,
          message: `No available copy found for "${book.title}".`,
        });
      }
    }

    // Prevent duplicate active assignment of the exact same book to the same student
    const existingActive = await Assignment.findOne({
      member: memberId,
      book: bookId,
      status: { $in: ['assigned', 'overdue'] },
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `Student ${member.name} already has an unreturned copy of "${book.title}" (Serial No: ${existingActive.accessionNumber || 'N/A'}).`,
      });
    }

    const assignDateObj = assignedDate ? new Date(assignedDate) : new Date();
    const dueDateObj = new Date(dueDate);

    if (dueDateObj < assignDateObj) {
      return res.status(400).json({ success: false, message: 'Due date cannot be earlier than assignment date' });
    }

    // Create Assignment record
    const assignment = await Assignment.create({
      school: schoolId,
      member: member._id,
      book: book._id,
      copyNumber: targetCopy.copyNumber,
      accessionNumber: targetCopy.accessionNumber,
      assignedDate: assignDateObj,
      dueDate: dueDateObj,
      status: 'assigned',
      fineAmount: 0,
      fineStatus: 'none',
      remarks: remarks ? remarks.trim() : '',
    });

    // Mark copy in Book document
    targetCopy.status = 'assigned';
    targetCopy.assignedTo = member._id;
    targetCopy.assignedToName = member.name;
    targetCopy.assignedToId = member.memberId || (member as any).admissionNo || '';
    targetCopy.assignedDate = assignDateObj;
    targetCopy.dueDate = dueDateObj;
    targetCopy.assignmentId = assignment._id;

    // Update Book stock counts
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    book.assignedCopies = (book.assignedCopies || 0) + 1;
    await book.save();

    const populated = await Assignment.findById(assignment._id)
      .populate({
        path: 'book',
        populate: { path: 'category', select: 'name' },
      })
      .populate('member');

    return res.status(201).json({
      success: true,
      message: `Book "${book.title}" (Serial: ${targetCopy.accessionNumber}) assigned to ${member.name} successfully!`,
      data: populated,
    });
  } catch (error: any) {
    console.error('Create assignment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign book' });
  }
}

export async function returnBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { returnDate, finePaid, remarks } = req.body;

    const assignment = await Assignment.findById(id).populate('book').populate('member');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status === 'returned' || assignment.status === 'lost' || assignment.status === 'damaged') {
      return res.status(400).json({ success: false, message: `Cannot return a book that is already marked as ${assignment.status.toUpperCase()}.` });
    }

    const setting = await LibrarySetting.findOne() || { finePerDay: 2, fineRules: [] };
    const retDate = returnDate ? new Date(returnDate) : new Date();
    const dueDate = new Date(assignment.dueDate);

    // Calculate Late Days and Fine with effective-date slabs
    const fineCalc = calculateFineBreakdown(dueDate, retDate, setting);
    const lateDays = fineCalc.lateDays;
    const fineAmount = fineCalc.fineAmount;
    const fineBreakdown = fineCalc.breakdown;

    let fineStatus: 'none' | 'pending' | 'paid' = 'none';
    if (fineAmount > 0) {
      fineStatus = finePaid ? 'paid' : 'pending';
    }

    assignment.returnedDate = retDate;
    assignment.status = 'returned';
    assignment.fineAmount = fineAmount;
    assignment.fineStatus = fineStatus;
    assignment.fineBreakdown = fineBreakdown as any;
    if (remarks) {
      assignment.remarks = remarks.trim();
    }
    await assignment.save();

    // Increment available copies, decrement assigned copies, and release the copy in copiesList
    const book = await Book.findById(assignment.book._id || assignment.book);
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, (book.availableCopies || 0) + 1);
      book.assignedCopies = Math.max(0, (book.assignedCopies || 0) - 1);

      if (Array.isArray(book.copiesList)) {
        const copy = book.copiesList.find(
          (c) =>
            (c.assignmentId && c.assignmentId.toString() === assignment._id.toString()) ||
            (assignment.accessionNumber && c.accessionNumber === assignment.accessionNumber) ||
            (assignment.copyNumber && c.copyNumber === assignment.copyNumber)
        );
        if (copy) {
          copy.status = 'available';
          copy.assignedTo = null;
          copy.assignedToName = '';
          copy.assignedToId = '';
          copy.assignedDate = null;
          copy.dueDate = null;
          copy.assignmentId = null;
        }
      }
      await book.save();
    }

    const breakdownText = fineBreakdown.length > 1
      ? ` (${fineBreakdown.map((b) => `${b.days}d @ ₹${b.ratePerDay}`).join(' + ')} = ₹${fineAmount})`
      : '';

    return res.json({
      success: true,
      message: `Book returned successfully! ${fineAmount > 0 ? `Calculated Fine: ₹${fineAmount}${breakdownText} [${fineStatus.toUpperCase()}]` : 'No fine incurred.'}`,
      data: {
        assignment,
        lateDays,
        fineAmount,
        fineStatus,
        fineBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Return book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to return book' });
  }
}

export async function reissueBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { newDueDate, remarks, finePaid, fineAmount, waivedAmount, receiptNo, paymentMethod } = req.body;

    const assignment = await Assignment.findById(id).populate('book').populate('member');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status === 'returned' || assignment.status === 'lost' || assignment.status === 'damaged') {
      return res.status(400).json({ success: false, message: `Cannot reissue a book that is marked as ${assignment.status.toUpperCase()}.` });
    }

    if (!newDueDate) {
      return res.status(400).json({ success: false, message: 'New due date is required for re-issuing the book.' });
    }

    const newDue = new Date(newDueDate);
    const prevDue = new Date(assignment.dueDate);

    if (isNaN(newDue.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid new due date provided.' });
    }

    if (newDue <= new Date(assignment.assignedDate)) {
      return res.status(400).json({ success: false, message: 'New due date must be after the original assignment date.' });
    }

    if (!assignment.originalDueDate) {
      assignment.originalDueDate = prevDue;
    }

    assignment.reissueHistory = assignment.reissueHistory || [];
    assignment.reissueHistory.push({
      reissuedAt: new Date(),
      previousDueDate: prevDue,
      newDueDate: newDue,
      remarks: remarks || 'Re-issued / Renewed loan',
    });

    assignment.reissueCount = (assignment.reissueCount || 0) + 1;
    assignment.dueDate = newDue;
    assignment.status = 'assigned';

    // Handle any fine settlement / waiver during reissue if passed
    if (typeof fineAmount === 'number' && fineAmount >= 0) {
      assignment.fineAmount = fineAmount;
      if (finePaid || fineAmount === 0) {
        assignment.fineStatus = fineAmount === 0 && (waivedAmount || 0) > 0 ? 'none' : finePaid ? 'paid' : 'none';
      }
    }
    if (typeof waivedAmount === 'number' && waivedAmount >= 0) {
      assignment.waivedAmount = (assignment.waivedAmount || 0) + waivedAmount;
    }
    if (receiptNo) assignment.receiptNo = receiptNo;
    if (paymentMethod) assignment.paymentMethod = paymentMethod;
    if (remarks) {
      assignment.remarks = assignment.remarks
        ? `${assignment.remarks} | Reissue #${assignment.reissueCount}: ${remarks}`
        : `Reissue #${assignment.reissueCount}: ${remarks}`;
    }

    await assignment.save();

    const populated = await Assignment.findById(assignment._id)
      .populate({
        path: 'book',
        populate: { path: 'category', select: 'name' },
      })
      .populate('member');

    return res.json({
      success: true,
      message: `Book "${assignment.book?.title}" re-issued successfully! New Due Date: ${newDue.toLocaleDateString('en-IN')} (Reissue #${assignment.reissueCount})`,
      data: populated,
    });
  } catch (error: any) {
    console.error('Reissue book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to re-issue book' });
  }
}

export async function updateFineStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fineStatus, fineAmount, originalFine, waivedAmount, receiptNo, paymentMethod, remarks } = req.body;

    if (!['none', 'pending', 'paid', 'waived'].includes(fineStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid fine status' });
    }

    const assignment = await Assignment.findById(id).populate('book').populate('member');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const normalizedStatus = fineStatus === 'waived' ? 'none' : fineStatus;
    assignment.fineStatus = normalizedStatus;
    if (typeof fineAmount === 'number' && fineAmount >= 0) {
      assignment.fineAmount = fineAmount;
    }
    if (typeof originalFine === 'number' && originalFine >= 0) {
      assignment.originalFine = originalFine;
    }
    if (typeof waivedAmount === 'number' && waivedAmount >= 0) {
      assignment.waivedAmount = waivedAmount;
    }
    if (receiptNo) assignment.receiptNo = receiptNo;
    if (paymentMethod) assignment.paymentMethod = paymentMethod;
    if (remarks !== undefined) {
      assignment.remarks = remarks.trim();
    }
    await assignment.save();

    let msg = `Fine status updated successfully!`;
    if (waivedAmount && waivedAmount > 0) {
      msg = `Fine adjusted: ₹${waivedAmount} waived, ₹${fineAmount || 0} ${normalizedStatus === 'paid' ? 'paid' : 'pending'}.`;
    } else if (normalizedStatus === 'paid') {
      msg = `Fine of ₹${fineAmount || 0} recorded as PAID (Receipt: ${receiptNo || 'N/A'}).`;
    }

    return res.json({
      success: true,
      message: msg,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Update fine error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update fine status' });
  }
}

export async function reportLostOrDamagedAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      type = 'lost', // 'lost' | 'damaged' | 'replaced'
      resolutionType = 'cash_recovery', // 'cash_recovery' | 'book_replaced'
      replacementAccessionNo,
      fineAmount = 0,
      fineStatus = 'pending', // 'none' | 'pending' | 'paid'
      paymentMethod = 'Cash',
      receiptNo,
      reason,
      remarks,
    } = req.body;

    const isReplacement = resolutionType === 'book_replaced' || type === 'replaced';
    const effectiveType = isReplacement ? 'replaced' : (type === 'damaged' ? 'damaged' : 'lost');

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A reason or description is required' });
    }

    const assignment = await Assignment.findById(id).populate('book').populate('member');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status === 'returned') {
      return res.status(400).json({ success: false, message: 'This book has already been marked as returned.' });
    }

    const fineNum = Math.max(0, parseFloat(fineAmount) || 0);
    const normalizedFineStatus = fineNum === 0 ? 'none' : (fineStatus === 'paid' ? 'paid' : 'pending');

    const now = new Date();

    if (isReplacement) {
      assignment.status = 'returned';
      assignment.lostOrDamaged = 'replaced';
      assignment.returnedDate = now;
      assignment.fineAmount = fineNum;
      assignment.fineStatus = normalizedFineStatus;
      if (receiptNo) assignment.receiptNo = receiptNo.trim();
      if (paymentMethod) assignment.paymentMethod = paymentMethod.trim();
      assignment.remarks = remarks
        ? `${assignment.remarks ? `${assignment.remarks} | ` : ''}Replacement Copy Provided${replacementAccessionNo ? ` (Acc: ${replacementAccessionNo.trim()})` : ''} - ${reason.trim()} | ${remarks.trim()}`
        : `${assignment.remarks ? `${assignment.remarks} | ` : ''}Replacement Copy Provided${replacementAccessionNo ? ` (Acc: ${replacementAccessionNo.trim()})` : ''} - ${reason.trim()}`;

      await assignment.save();

      // Book stock is preserved: decrement assigned, restore to available
      const book = await Book.findById(assignment.book._id || assignment.book);
      if (book) {
        book.assignedCopies = Math.max(0, (book.assignedCopies || 0) - 1);
        book.availableCopies = Math.max(0, (book.totalCopies || 0) - book.assignedCopies);
        await book.save();
      }

      await LostDamageLog.create({
        book: assignment.book._id || assignment.book,
        assignment: assignment._id,
        member: assignment.member._id || assignment.member,
        type: 'replaced',
        resolutionType: 'book_replaced',
        replacementAccessionNo: replacementAccessionNo ? replacementAccessionNo.trim() : undefined,
        copiesCount: 1,
        fineAmount: fineNum,
        fineStatus: normalizedFineStatus,
        paymentMethod: paymentMethod ? paymentMethod.trim() : undefined,
        receiptNo: receiptNo ? receiptNo.trim() : undefined,
        reason: reason.trim(),
        reportedBy: 'Admin / Librarian',
        source: 'assignment',
        stockDeducted: false,
      });

      const populated = await Assignment.findById(assignment._id)
        .populate({
          path: 'book',
          populate: { path: 'category', select: 'name' },
        })
        .populate('member');

      return res.json({
        success: true,
        message: `Replacement copy recorded for "${assignment.book?.title}". Library inventory stock is preserved and student record closed.`,
        data: populated,
      });
    }

    assignment.status = effectiveType;
    assignment.lostOrDamaged = effectiveType;
    assignment.damageOrLostFine = fineNum;
    assignment.damageOrLostReason = reason.trim();
    assignment.damageOrLostDate = now;
    assignment.returnedDate = now;
    assignment.fineAmount = fineNum;
    assignment.fineStatus = normalizedFineStatus;
    if (receiptNo) assignment.receiptNo = receiptNo.trim();
    if (paymentMethod) assignment.paymentMethod = paymentMethod.trim();
    assignment.remarks = remarks
      ? `${assignment.remarks ? `${assignment.remarks} | ` : ''}Condition: ${effectiveType.toUpperCase()} (${reason.trim()})${remarks.trim() ? ` - ${remarks.trim()}` : ''}`
      : `${assignment.remarks ? `${assignment.remarks} | ` : ''}Condition: ${effectiveType.toUpperCase()} (${reason.trim()})`;

    await assignment.save();

    // Update Book stock counts for Cash Recovery
    const book = await Book.findById(assignment.book._id || assignment.book);
    if (book) {
      book.assignedCopies = Math.max(0, (book.assignedCopies || 0) - 1);
      if (effectiveType === 'lost') {
        book.lostCopies = (book.lostCopies || 0) + 1;
      } else {
        book.damagedCopies = (book.damagedCopies || 0) + 1;
      }
      book.totalCopies = Math.max(1, (book.totalCopies || 1) - 1);
      book.availableCopies = Math.max(0, book.totalCopies - book.assignedCopies);

      if (Array.isArray(book.copiesList)) {
        const copy = book.copiesList.find(
          (c) =>
            (c.assignmentId && c.assignmentId.toString() === assignment._id.toString()) ||
            (assignment.accessionNumber && c.accessionNumber === assignment.accessionNumber) ||
            (assignment.copyNumber && c.copyNumber === assignment.copyNumber)
        );
        if (copy) {
          copy.status = effectiveType as 'lost' | 'damaged';
        }
      }
      await book.save();
    }

    // Create a LostDamageLog audit entry
    await LostDamageLog.create({
      book: assignment.book._id || assignment.book,
      assignment: assignment._id,
      member: assignment.member._id || assignment.member,
      type: effectiveType,
      resolutionType: 'cash_recovery',
      copiesCount: 1,
      fineAmount: fineNum,
      fineStatus: normalizedFineStatus,
      paymentMethod: paymentMethod ? paymentMethod.trim() : undefined,
      receiptNo: receiptNo ? receiptNo.trim() : undefined,
      reason: reason.trim(),
      reportedBy: 'Admin / Librarian',
      source: 'assignment',
      stockDeducted: true,
    });

    const populated = await Assignment.findById(assignment._id)
      .populate({
        path: 'book',
        populate: { path: 'category', select: 'name' },
      })
      .populate('member');

    return res.json({
      success: true,
      message: `Book "${assignment.book?.title}" successfully recorded as ${effectiveType.toUpperCase()} with ₹${fineNum} penalty [${normalizedFineStatus.toUpperCase()}]. 1 copy deducted from library stock.`,
      data: populated,
    });
  } catch (error: any) {
    console.error('Report lost/damaged assignment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record lost/damaged book status' });
  }
}

