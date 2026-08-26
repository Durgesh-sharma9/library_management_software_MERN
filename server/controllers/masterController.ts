import { Request, Response } from 'express';
import { SchoolClass } from '../models/SchoolClass.js';
import { SchoolSection } from '../models/SchoolSection.js';
import { getRequestSchoolId } from '../middleware/auth.js';

// Default predefined masters
const DEFAULT_CLASSES = [
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11 (Science)',
  'Class 11 (Commerce)',
  'Class 11 (Arts)',
  'Class 12 (Science)',
  'Class 12 (Commerce)',
  'Class 12 (Arts)',
];

const DEFAULT_SECTIONS = ['A', 'B', 'C', 'D'];

export async function ensureDefaultMasters(schoolId?: any) {
  try {
    const classCount = await SchoolClass.countDocuments({
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (classCount === 0) {
      const classDocs = DEFAULT_CLASSES.map((name, index) => ({
        school: schoolId,
        name,
        order: index + 1,
        sections: ['A', 'B', 'C', 'D'],
        isActive: true,
      }));
      await SchoolClass.insertMany(classDocs);
    } else {
      // Ensure any existing classes have default sections if empty
      await SchoolClass.updateMany(
        {
          ...(schoolId ? { school: schoolId } : {}),
          $or: [{ sections: { $exists: false } }, { sections: { $size: 0 } }],
        },
        { $set: { sections: ['A', 'B', 'C', 'D'] } }
      );
    }

    const sectionCount = await SchoolSection.countDocuments({
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (sectionCount === 0) {
      const sectionDocs = DEFAULT_SECTIONS.map((name, index) => ({
        school: schoolId,
        name,
        order: index + 1,
        isActive: true,
      }));
      await SchoolSection.insertMany(sectionDocs);
    }
  } catch (err) {
    console.error('Error ensuring default masters:', err);
  }
}

// ---------------- CLASS MASTER ----------------

export async function getClasses(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    await ensureDefaultMasters(schoolId);
    const { includeInactive } = req.query;
    const filter: any = {};
    if (schoolId) filter.school = schoolId;
    if (includeInactive !== 'true') filter.isActive = true;

    const classes = await SchoolClass.find(filter).sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: classes });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch classes' });
  }
}

export async function createClass(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { name, order, sections } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Class name is required' });
    }

    const trimmed = name.trim();
    const existing = await SchoolClass.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Class "${trimmed}" already exists.` });
    }

    const maxOrderDoc = await SchoolClass.findOne({ ...(schoolId ? { school: schoolId } : {}) }).sort({ order: -1 });
    const nextOrder = order !== undefined ? Number(order) : (maxOrderDoc?.order || 0) + 1;

    const sectionsList = Array.isArray(sections) && sections.length > 0
      ? sections.map((s: string) => s.trim()).filter(Boolean)
      : ['A', 'B', 'C', 'D'];

    const newClass = await SchoolClass.create({
      school: schoolId,
      name: trimmed,
      order: nextOrder,
      sections: sectionsList,
      isActive: true,
    });

    return res.status(201).json({ success: true, message: 'Class added successfully', data: newClass });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create class' });
  }
}

export async function updateClass(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const { name, order, sections, isActive } = req.body;

    const schoolClass = await SchoolClass.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (name && name.trim() !== schoolClass.name) {
      const existing = await SchoolClass.findOne({
        _id: { $ne: id },
        ...(schoolId ? { school: schoolId } : {}),
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Class "${name.trim()}" already exists` });
      }
      schoolClass.name = name.trim();
    }

    if (order !== undefined) schoolClass.order = Number(order);
    if (Array.isArray(sections)) {
      schoolClass.sections = sections.map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof isActive === 'boolean') schoolClass.isActive = isActive;

    await schoolClass.save();
    return res.json({ success: true, message: 'Class updated successfully', data: schoolClass });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update class' });
  }
}

export async function deleteClass(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    await SchoolClass.findOneAndDelete({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete class' });
  }
}

// ---------------- SECTION MASTER ----------------

export async function getSections(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    await ensureDefaultMasters(schoolId);
    const { includeInactive } = req.query;
    const filter: any = {};
    if (schoolId) filter.school = schoolId;
    if (includeInactive !== 'true') filter.isActive = true;

    const sections = await SchoolSection.find(filter).sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: sections });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
}

export async function createSection(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { name, order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }

    const trimmed = name.trim().toUpperCase();
    const existing = await SchoolSection.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      name: trimmed,
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Section "${trimmed}" already exists.` });
    }

    const maxOrderDoc = await SchoolSection.findOne({ ...(schoolId ? { school: schoolId } : {}) }).sort({ order: -1 });
    const nextOrder = order !== undefined ? Number(order) : (maxOrderDoc?.order || 0) + 1;

    const newSection = await SchoolSection.create({
      school: schoolId,
      name: trimmed,
      order: nextOrder,
      isActive: true,
    });

    return res.status(201).json({ success: true, message: 'Section added successfully', data: newSection });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create section' });
  }
}

export async function updateSection(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const { name, order, isActive } = req.body;

    const section = await SchoolSection.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    if (name && name.trim().toUpperCase() !== section.name) {
      const existing = await SchoolSection.findOne({
        _id: { $ne: id },
        ...(schoolId ? { school: schoolId } : {}),
        name: name.trim().toUpperCase(),
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Section "${name.trim().toUpperCase()}" already exists` });
      }
      section.name = name.trim().toUpperCase();
    }

    if (order !== undefined) section.order = Number(order);
    if (typeof isActive === 'boolean') section.isActive = isActive;

    await section.save();
    return res.json({ success: true, message: 'Section updated successfully', data: section });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update section' });
  }
}

export async function deleteSection(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    await SchoolSection.findOneAndDelete({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    return res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete section' });
  }
}
