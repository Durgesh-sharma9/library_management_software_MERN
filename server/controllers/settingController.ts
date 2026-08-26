import { Request, Response } from 'express';
import { LibrarySetting, IFineRule } from '../models/LibrarySetting.js';
import { Assignment } from '../models/Assignment.js';
import { Member } from '../models/Member.js';
import { Book } from '../models/Book.js';
import { seedDatabase } from '../services/seed.js';
import { calculateFineBreakdown } from '../services/fineCalculator.js';
import { getRequestSchoolId } from '../middleware/auth.js';

/**
 * Helper to find all members who currently hold more active/unreturned books
 * than a proposed maximum limit.
 */
export async function getMembersExceedingLimit(targetLimit: number, schoolId?: any) {
  // Query all active unreturned assignments
  const filter: any = {
    status: { $in: ['assigned', 'overdue'] },
  };
  if (schoolId) filter.school = schoolId;

  const activeAssignments = await Assignment.find(filter)
    .populate({
      path: 'book',
      select: 'title author accessionNumber language category',
    })
    .populate({
      path: 'member',
      select: 'name memberId memberType admissionNo rollNumber className section department designation status',
    });

  const memberMap = new Map<string, {
    member: any;
    count: number;
    books: Array<{
      assignmentId: string;
      bookId: string;
      title: string;
      author: string;
      accessionNumber: string;
      assignedDate: Date;
      dueDate: Date;
      status: string;
    }>;
  }>();

  for (const item of activeAssignments) {
    if (!item.member) continue;
    const mId = item.member._id.toString();
    if (!memberMap.has(mId)) {
      memberMap.set(mId, {
        member: item.member,
        count: 0,
        books: [],
      });
    }
    const entry = memberMap.get(mId)!;
    entry.count += 1;
    entry.books.push({
      assignmentId: item._id.toString(),
      bookId: item.book?._id ? item.book._id.toString() : '',
      title: item.book?.title || 'Unknown Book',
      author: item.book?.author || 'Unknown',
      accessionNumber: item.book?.accessionNumber || '—',
      assignedDate: item.assignedDate,
      dueDate: item.dueDate,
      status: item.status,
    });
  }

  const violators: any[] = [];
  for (const [, val] of memberMap.entries()) {
    if (val.count > targetLimit) {
      violators.push({
        memberId: val.member._id,
        memberCode: val.member.memberId,
        name: val.member.name,
        memberType: val.member.memberType || 'student',
        admissionNo: val.member.admissionNo || '',
        className: val.member.className || '',
        section: val.member.section || '',
        department: val.member.department || '',
        designation: val.member.designation || '',
        activeBooksCount: val.count,
        books: val.books,
      });
    }
  }

  // Sort violators descending by activeBooksCount
  violators.sort((a, b) => b.activeBooksCount - a.activeBooksCount);
  return violators;
}

export async function checkMaxBooksLimit(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const limitQuery = req.query.limit;
    if (!limitQuery) {
      return res.status(400).json({ success: false, message: 'Limit query parameter is required' });
    }
    const targetLimit = parseInt(limitQuery as string, 10);
    if (isNaN(targetLimit) || targetLimit < 1) {
      return res.status(400).json({ success: false, message: 'Invalid limit value' });
    }

    const violators = await getMembersExceedingLimit(targetLimit, schoolId);
    const allowed = violators.length === 0;

    return res.json({
      success: true,
      allowed,
      proposedLimit: targetLimit,
      violatingCount: violators.length,
      violatingMembers: violators,
      message: allowed
        ? `Limit of ${targetLimit} books per member is valid. No current members exceed this limit.`
        : `Cannot lower limit to ${targetLimit}: ${violators.length} member(s) currently hold more than ${targetLimit} books.`,
    });
  } catch (error: any) {
    console.error('Check max books limit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify borrowing limit' });
  }
}

export async function previewFineCalculation(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { dueDate, targetDate, finePerDay, fineRules } = req.body;
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Due Date is required for calculation' });
    }

    let settings = await LibrarySetting.findOne({ ...(schoolId ? { school: schoolId } : {}) });
    const effectiveSettings = {
      finePerDay: finePerDay !== undefined ? Number(finePerDay) : settings?.finePerDay || 2,
      fineRules: fineRules && Array.isArray(fineRules) ? fineRules : settings?.fineRules || [],
    };

    const result = calculateFineBreakdown(dueDate, targetDate || new Date(), effectiveSettings);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Fine calculation preview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute fine breakdown' });
  }
}

export async function getSettings(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    let settings = await LibrarySetting.findOne({ ...(schoolId ? { school: schoolId } : {}) });
    if (!settings) {
      settings = await LibrarySetting.create({
        school: schoolId,
        libraryName: 'School Central Library',
        schoolName: 'International Public School',
        issueDuration: 14,
        finePerDay: 2,
        fineEffectiveDate: new Date('2020-01-01'),
        fineRules: [
          {
            effectiveDate: new Date('2020-01-01'),
            finePerDay: 2,
            note: 'Initial default rate',
          },
        ],
        maxBooksPerMember: 3,
        accessionPrefix: 'ACC',
        accessionStartNumber: 1,
        accessionPadding: 4,
        accessionSeparator: '-',
        contactEmail: 'library@school.edu',
        contactPhone: '+91 98765 43210',
        currency: '₹',
      });
    } else if (!settings.fineRules || settings.fineRules.length === 0) {
      settings.fineRules = [
        {
          effectiveDate: settings.fineEffectiveDate || new Date('2020-01-01'),
          finePerDay: settings.finePerDay || 2,
          note: 'Initial default rate',
        },
      ];
      await settings.save();
    }
    return res.json({ success: true, data: settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch library settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const {
      libraryName,
      schoolName,
      issueDuration,
      finePerDay,
      fineEffectiveDate,
      fineRules,
      maxBooksPerMember,
      accessionPrefix,
      accessionStartNumber,
      accessionPadding,
      accessionSeparator,
      contactEmail,
      contactPhone,
      currency,
    } = req.body;

    let settings = await LibrarySetting.findOne({ ...(schoolId ? { school: schoolId } : {}) });
    if (!settings) {
      settings = new LibrarySetting({ school: schoolId });
    }

    // If maxBooksPerMember is provided, check if existing active borrowers exceed this new proposed limit
    if (maxBooksPerMember !== undefined) {
      const parsedMax = parseInt(maxBooksPerMember, 10);
      if (isNaN(parsedMax) || parsedMax < 1) {
        return res.status(400).json({
          success: false,
          message: 'Maximum books limit per member must be at least 1',
        });
      }

      const currentLimit = settings.maxBooksPerMember || 3;
      const violators = await getMembersExceedingLimit(parsedMax, schoolId);
      if (violators.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'LIMIT_VIOLATION_EXISTING_BORROWERS',
          message: `Cannot change Maximum Books Limit to ${parsedMax}. There are currently ${violators.length} member(s) who hold more than ${parsedMax} unreturned book(s). Please ensure these members return their excess books before lowering the limit.`,
          currentLimit,
          proposedLimit: parsedMax,
          violatingCount: violators.length,
          violatingMembers: violators,
        });
      }

      settings.maxBooksPerMember = parsedMax;
    }

    if (libraryName) settings.libraryName = libraryName.trim();
    if (schoolName !== undefined) settings.schoolName = schoolName.trim();
    if (issueDuration !== undefined) {
      const parsed = parseInt(issueDuration, 10);
      if (parsed > 0) settings.issueDuration = parsed;
    }

    // Handle fine rules array if passed directly
    if (fineRules && Array.isArray(fineRules)) {
      const cleanRules: IFineRule[] = fineRules
        .filter((r) => r && r.effectiveDate && typeof r.finePerDay === 'number')
        .map((r) => ({
          effectiveDate: new Date(r.effectiveDate),
          finePerDay: Math.max(0, Number(r.finePerDay)),
          note: r.note ? String(r.note).trim() : '',
        }))
        .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

      if (cleanRules.length > 0) {
        settings.fineRules = cleanRules;
        // Determine the latest active rate up to today or last rule
        const nowTime = new Date().getTime();
        let latestActive = cleanRules[0].finePerDay;
        let latestDate = cleanRules[0].effectiveDate;
        for (const rule of cleanRules) {
          if (new Date(rule.effectiveDate).getTime() <= nowTime) {
            latestActive = rule.finePerDay;
            latestDate = rule.effectiveDate;
          }
        }
        settings.finePerDay = latestActive;
        settings.fineEffectiveDate = latestDate;
      }
    } else if (finePerDay !== undefined) {
      // If finePerDay updated from standard input
      const parsedFine = parseFloat(finePerDay);
      if (parsedFine >= 0) {
        settings.finePerDay = parsedFine;
        const effDate = fineEffectiveDate ? new Date(fineEffectiveDate) : new Date();
        settings.fineEffectiveDate = effDate;

        // Sync into fineRules array
        const currentRules = (settings.fineRules || []).map((r) => ({
          effectiveDate: new Date(r.effectiveDate),
          finePerDay: r.finePerDay,
          note: r.note || '',
        }));

        // Check if a rule for this exact date (YYYY-MM-DD) already exists
        const effDateStr = effDate.toISOString().split('T')[0];
        let found = false;
        for (let i = 0; i < currentRules.length; i++) {
          const ruleDateStr = currentRules[i].effectiveDate.toISOString().split('T')[0];
          if (ruleDateStr === effDateStr) {
            currentRules[i].finePerDay = parsedFine;
            currentRules[i].note = `Updated to ${parsedFine}/day`;
            found = true;
            break;
          }
        }

        if (!found) {
          currentRules.push({
            effectiveDate: effDate,
            finePerDay: parsedFine,
            note: `Rate set to ${parsedFine}/day from ${effDateStr}`,
          });
        }

        // Keep sorted
        currentRules.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
        settings.fineRules = currentRules as any;
      }
    }

    if (accessionPrefix !== undefined) {
      settings.accessionPrefix = accessionPrefix.trim().toUpperCase() || 'ACC';
    }
    if (accessionStartNumber !== undefined) {
      const parsedStart = parseInt(accessionStartNumber, 10);
      if (!isNaN(parsedStart) && parsedStart >= 0) {
        settings.accessionStartNumber = parsedStart;
      }
    }
    if (accessionPadding !== undefined) {
      const parsedPad = parseInt(accessionPadding, 10);
      if (!isNaN(parsedPad) && parsedPad >= 1 && parsedPad <= 10) {
        settings.accessionPadding = parsedPad;
      }
    }
    if (accessionSeparator !== undefined) {
      settings.accessionSeparator = accessionSeparator;
    }

    if (contactEmail !== undefined) settings.contactEmail = contactEmail.trim();
    if (contactPhone !== undefined) settings.contactPhone = contactPhone.trim();
    if (currency !== undefined) settings.currency = currency.trim();

    await settings.save();
    return res.json({ success: true, message: 'Library settings updated successfully', data: settings });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update library settings' });
  }
}

export async function seedSampleData(req: Request, res: Response) {
  try {
    await seedDatabase(true);
    return res.json({
      success: true,
      message: 'Comprehensive library demo dataset populated successfully!',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed sample data',
    });
  }
}

