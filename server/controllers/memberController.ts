import { Request, Response } from 'express';
import { Member } from '../models/Member.js';
import { Assignment } from '../models/Assignment.js';
import { LibrarySetting } from '../models/LibrarySetting.js';
import { getRequestSchoolId } from '../middleware/auth.js';

export async function getNextMemberId(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { type } = req.query;
    const isTeacher = type === 'teacher';
    const prefix = isTeacher ? 'LIB-T' : 'LIB-';

    const latestMember = await Member.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      memberId: { $regex: new RegExp(`^${prefix}\\d+`, 'i') },
    }).sort({ createdAt: -1 });

    let nextIdNumber = 1;
    if (latestMember && latestMember.memberId) {
      const match = latestMember.memberId.match(new RegExp(`${prefix}(\\d+)`, 'i'));
      if (match && match[1]) {
        nextIdNumber = parseInt(match[1], 10) + 1;
      }
    } else {
      const count = await Member.countDocuments({
        ...(schoolId ? { school: schoolId } : {}),
        memberType: isTeacher ? 'teacher' : 'student',
      });
      nextIdNumber = count + 1;
    }

    const nextMemberId = `${prefix}${String(nextIdNumber).padStart(4, '0')}`;
    return res.json({ success: true, nextMemberId });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate member ID' });
  }
}

export async function getMembers(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { search, className, section, status, memberType } = req.query;
    const query: any = {};
    if (schoolId) query.school = schoolId;

    if (memberType && typeof memberType === 'string' && memberType !== 'all') {
      query.memberType = memberType;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { memberId: regex },
        { admissionNo: regex },
        { designation: regex },
        { department: regex },
        { whatsapp: regex },
        { email: regex },
      ];
    }

    if (className && typeof className === 'string' && className !== 'all') {
      query.className = className;
    }

    if (section && typeof section === 'string' && section !== 'all') {
      query.section = section;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query.status = status;
    }

    const members = await Member.find(query).sort({ createdAt: -1 });
    const setting = (await LibrarySetting.findOne({ ...(schoolId ? { school: schoolId } : {}) })) || { finePerDay: 2 };
    const now = new Date();

    // Attach active assignment metrics for each member
    const membersWithStats = await Promise.all(
      members.map(async (m) => {
        const activeAssignments = await Assignment.find({
          member: m._id,
          status: { $in: ['assigned', 'overdue'] },
          ...(schoolId ? { school: schoolId } : {}),
        }).populate('book', 'title');

        const overdueCount = activeAssignments.filter((a) => new Date(a.dueDate) < now).length;

        // Calculate pending fines from both returned pending fines and overdue active fines
        const returnedPending = await Assignment.find({
          member: m._id,
          fineStatus: 'pending',
          ...(schoolId ? { school: schoolId } : {}),
        });
        const returnedFines = returnedPending.reduce((sum, a) => sum + (a.fineAmount || 0), 0);

        let activeFines = 0;
        activeAssignments.forEach((a) => {
          if (new Date(a.dueDate) < now) {
            const diffTime = Math.abs(now.getTime() - new Date(a.dueDate).getTime());
            const lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (a.fineStatus !== 'paid' && a.fineStatus !== 'none') {
              activeFines += lateDays * setting.finePerDay;
            }
          }
        });

        return {
          ...m.toObject(),
          assignedBooksCount: activeAssignments.length,
          overdueBooksCount: overdueCount,
          pendingFine: returnedFines + activeFines,
        };
      })
    );

    return res.json({ success: true, data: membersWithStats });
  } catch (error: any) {
    console.error('Get members error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch members' });
  }
}

export async function getMemberById(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const member = await Member.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const setting = (await LibrarySetting.findOne({ ...(schoolId ? { school: schoolId } : {}) })) || { finePerDay: 2 };
    const now = new Date();

    // Get currently assigned
    const currentlyAssigned = await Assignment.find({
      member: id,
      status: { $in: ['assigned', 'overdue'] },
      ...(schoolId ? { school: schoolId } : {}),
    })
      .populate('book', 'title author accessionNumber language category publisher publisherNumber')
      .sort({ assignedDate: -1 });

    const activeWithLiveFine = currentlyAssigned.map((a) => {
      let lateDays = 0;
      let fine = 0;
      const isOverdue = new Date(a.dueDate) < now;
      if (isOverdue) {
        const diffTime = Math.abs(now.getTime() - new Date(a.dueDate).getTime());
        lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (a.fineStatus !== 'paid' && a.fineStatus !== 'none') {
          fine = lateDays * setting.finePerDay;
        } else {
          fine = a.fineAmount || 0;
        }
      }
      return {
        ...a.toObject(),
        isOverdue,
        lateDays,
        liveFine: fine,
      };
    });

    // Get previous history (returned)
    const previousHistory = await Assignment.find({
      member: id,
      status: 'returned',
      ...(schoolId ? { school: schoolId } : {}),
    })
      .populate('book', 'title author language category')
      .sort({ returnedDate: -1 });

    return res.json({
      success: true,
      data: {
        member,
        currentlyAssigned: activeWithLiveFine,
        previousHistory,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch member profile' });
  }
}

export async function createMember(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    let { memberId, memberType, name, whatsapp, email, className, section, designation, department, admissionNo, status } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Member / Name is required' });
    }
    if (!whatsapp || whatsapp.trim() === '') {
      return res.status(400).json({ success: false, message: 'Contact / WhatsApp number is required' });
    }

    const type = memberType === 'teacher' ? 'teacher' : 'student';

    if (!memberId || memberId.trim() === '') {
      // Auto-generate based on type
      const prefix = type === 'teacher' ? 'LIB-T' : 'LIB-';
      const count = await Member.countDocuments({
        ...(schoolId ? { school: schoolId } : {}),
        memberType: type,
      });
      memberId = `${prefix}${String(count + 1).padStart(4, '0')}`;
    }

    const trimmedId = memberId.trim().toUpperCase();
    const existing = await Member.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      memberId: trimmedId,
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Member ID "${trimmedId}" already exists. Please use a unique ID.` });
    }

    const member = await Member.create({
      school: schoolId,
      memberId: trimmedId,
      memberType: type,
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: email ? email.trim() : '',
      className: type === 'student' && className ? className.trim() : '',
      section: type === 'student' && section ? section.trim() : '',
      admissionNo: admissionNo ? admissionNo.trim() : '',
      designation: type === 'teacher' && designation ? designation.trim() : '',
      department: type === 'teacher' && department ? department.trim() : '',
      status: status || 'active',
    });

    return res.status(201).json({ success: true, message: `${type === 'teacher' ? 'Teacher' : 'Student'} registered successfully`, data: member });
  } catch (error: any) {
    console.error('Create member error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add member' });
  }
}

export async function updateMember(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const { memberId, memberType, name, whatsapp, email, className, section, designation, department, admissionNo, status } = req.body;

    const member = await Member.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (memberId && memberId.trim().toUpperCase() !== member.memberId) {
      const existing = await Member.findOne({
        _id: { $ne: id },
        ...(schoolId ? { school: schoolId } : {}),
        memberId: memberId.trim().toUpperCase(),
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Member ID already in use by another person' });
      }
      member.memberId = memberId.trim().toUpperCase();
    }

    if (memberType && ['student', 'teacher'].includes(memberType)) member.memberType = memberType;
    if (name) member.name = name.trim();
    if (whatsapp) member.whatsapp = whatsapp.trim();
    if (email !== undefined) member.email = email.trim();
    if (className !== undefined) member.className = className.trim();
    if (section !== undefined) member.section = section.trim();
    if (designation !== undefined) member.designation = designation.trim();
    if (department !== undefined) member.department = department.trim();
    if (admissionNo !== undefined) member.admissionNo = admissionNo.trim();
    if (status) member.status = status;

    await member.save();
    return res.json({ success: true, message: 'Member updated successfully', data: member });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update member' });
  }
}

export async function deleteMember(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const member = await Member.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if member has active assigned books
    const activeAssignments = await Assignment.countDocuments({
      member: id,
      status: { $in: ['assigned', 'overdue'] },
      ...(schoolId ? { school: schoolId } : {}),
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete member. Member currently has ${activeAssignments} unreturned book(s). Please return them first.`,
      });
    }

    // Check if member has previous history
    const hasHistory = await Assignment.exists({
      member: id,
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (hasHistory) {
      member.status = 'inactive';
      await member.save();
      return res.json({
        success: true,
        message: 'Member has past library transaction history, so status was marked Inactive to preserve records.',
      });
    }

    await Member.findOneAndDelete({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    return res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
}

export async function bulkImportMembers(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { members, memberType = 'student' } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'No member records provided for import.' });
    }

    const defaultType = memberType === 'teacher' ? 'teacher' : 'student';
    const prefix = defaultType === 'teacher' ? 'LIB-T' : 'LIB-';

    // Get current sequence for auto IDs
    const latestMember = await Member.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      memberId: { $regex: new RegExp(`^${prefix}\\d+`, 'i') },
    }).sort({ createdAt: -1 });
    let nextIdNumber = 1;
    if (latestMember && latestMember.memberId) {
      const match = latestMember.memberId.match(new RegExp(`${prefix}(\\d+)`, 'i'));
      if (match && match[1]) {
        nextIdNumber = parseInt(match[1], 10) + 1;
      } else {
        const totalCount = await Member.countDocuments({
          ...(schoolId ? { school: schoolId } : {}),
          memberType: defaultType,
        });
        nextIdNumber = totalCount + 1;
      }
    }

    // Cache existing member IDs in this school
    const existingMembers = await Member.find({ ...(schoolId ? { school: schoolId } : {}) }, 'memberId');
    const existingIdSet = new Set(existingMembers.map((m) => m.memberId.toUpperCase()));

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < members.length; index++) {
      const item = members[index];
      const rowNumber = index + 1;

      const name = (item.name || item.Name || item['Student Name'] || item['Teacher Name'] || item['Full Name'] || item['member_name'] || '').toString().trim();
      let whatsapp = (item.whatsapp || item.WhatsApp || item.phone || item.Phone || item['Contact'] || item['Mobile'] || '').toString().trim();
      
      if (!name) {
        skippedCount++;
        errors.push(`Row #${rowNumber}: Skipped due to missing Member Name.`);
        continue;
      }

      if (!whatsapp) {
        whatsapp = '9876543210';
      }

      const itemType = (item.memberType || item.type || defaultType).toString().toLowerCase().includes('teach') ? 'teacher' : 'student';
      const itemPrefix = itemType === 'teacher' ? 'LIB-T' : 'LIB-';

      let memberId = (item.memberId || item.MemberId || item['Member ID'] || item['Admission No'] || item['Employee ID'] || item['Student ID'] || item['Roll No'] || '').toString().trim();
      
      if (!memberId) {
        while (existingIdSet.has(`${itemPrefix}${String(nextIdNumber).padStart(4, '0')}`)) {
          nextIdNumber++;
        }
        memberId = `${itemPrefix}${String(nextIdNumber).padStart(4, '0')}`;
        nextIdNumber++;
      } else {
        memberId = memberId.toUpperCase();
      }

      const email = (item.email || item.Email || '').toString().trim();
      const className = (item.className || item.class || item.Class || item['Class Name'] || item['Grade'] || '').toString().trim();
      const section = (item.section || item.Section || item.sec || '').toString().trim();
      const designation = (item.designation || item.Designation || item['Designation / Post'] || '').toString().trim();
      const department = (item.department || item.Department || item.Subject || item['Subject / Dept'] || '').toString().trim();
      const admissionNo = (item.admissionNo || item['Admission No'] || item['Admission Number'] || '').toString().trim();
      
      let status = (item.status || item.Status || 'active').toString().toLowerCase().trim();
      if (!['active', 'inactive'].includes(status)) {
        status = 'active';
      }

      if (existingIdSet.has(memberId)) {
        await Member.findOneAndUpdate(
          {
            memberId,
            ...(schoolId ? { school: schoolId } : {}),
          },
          {
            name,
            memberType: itemType,
            whatsapp,
            ...(email ? { email } : {}),
            ...(className ? { className } : {}),
            ...(section ? { section } : {}),
            ...(designation ? { designation } : {}),
            ...(department ? { department } : {}),
            ...(admissionNo ? { admissionNo } : {}),
            status,
          }
        );
        updatedCount++;
      } else {
        await Member.create({
          school: schoolId,
          memberId,
          memberType: itemType,
          name,
          whatsapp,
          email,
          className,
          section,
          designation,
          department,
          admissionNo,
          status,
        });
        existingIdSet.add(memberId);
        importedCount++;
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully processed ${importedCount + updatedCount} members (${importedCount} new, ${updatedCount} updated)${skippedCount > 0 ? `, skipped ${skippedCount} invalid rows` : ''}.`,
      importedCount,
      updatedCount,
      skippedCount,
      errors,
    });
  } catch (error: any) {
    console.error('Bulk import members error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete bulk members import', error: error.message });
  }
}

