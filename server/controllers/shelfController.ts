import { Request, Response } from 'express';
import { Shelf } from '../models/Shelf.js';
import { Book } from '../models/Book.js';
import { getRequestSchoolId } from '../middleware/auth.js';

// GET /api/shelves
export const getShelves = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const filter: any = {};
    if (schoolId) filter.school = schoolId;

    const shelves = await Shelf.find(filter).sort({ name: 1 });

    // Aggregate book statistics for each shelf
    const shelfStats = await Book.aggregate([
      {
        $match: {
          shelfLocation: { $exists: true, $ne: '' },
          ...(schoolId ? { school: schoolId } : {}),
        },
      },
      {
        $group: {
          _id: '$shelfLocation',
          booksCount: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' },
          assignedCopies: { $sum: '$assignedCopies' },
        },
      },
    ]);

    const statsMap = new Map<string, { booksCount: number; totalCopies: number; availableCopies: number; assignedCopies: number }>();
    shelfStats.forEach((stat) => {
      if (stat._id) {
        statsMap.set(stat._id.trim().toLowerCase(), {
          booksCount: stat.booksCount,
          totalCopies: stat.totalCopies,
          availableCopies: stat.availableCopies,
          assignedCopies: stat.assignedCopies,
        });
      }
    });

    const enriched = shelves.map((shelf) => {
      const stats = statsMap.get(shelf.name.trim().toLowerCase()) || {
        booksCount: 0,
        totalCopies: 0,
        availableCopies: 0,
        assignedCopies: 0,
      };
      return {
        ...shelf.toObject(),
        booksCount: stats.booksCount,
        totalCopies: stats.totalCopies,
        availableCopies: stats.availableCopies,
        assignedCopies: stats.assignedCopies,
      };
    });

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching shelves' });
  }
};

// POST /api/shelves
export const createShelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const { name, floorOrRoom, capacity, description, isActive } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Shelf name / Rack number is required' });
      return;
    }

    const existing = await Shelf.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Shelf/Rack with this name already exists' });
      return;
    }

    const shelf = await Shelf.create({
      school: schoolId,
      name: name.trim(),
      floorOrRoom: floorOrRoom?.trim() || '',
      capacity: capacity ? Number(capacity) : 100,
      description: description?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Shelf created successfully',
      data: shelf,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating shelf' });
  }
};

// PUT /api/shelves/:id
export const updateShelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const { name, floorOrRoom, capacity, description, isActive } = req.body;

    const shelf = await Shelf.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!shelf) {
      res.status(404).json({ success: false, message: 'Shelf not found' });
      return;
    }

    const oldName = shelf.name;

    if (name && name.trim().toLowerCase() !== shelf.name.toLowerCase()) {
      const existing = await Shelf.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id },
        ...(schoolId ? { school: schoolId } : {}),
      });
      if (existing) {
        res.status(400).json({ success: false, message: 'Shelf with this name already exists' });
        return;
      }
      shelf.name = name.trim();
    }

    if (floorOrRoom !== undefined) shelf.floorOrRoom = floorOrRoom.trim();
    if (capacity !== undefined) shelf.capacity = Number(capacity);
    if (description !== undefined) shelf.description = description.trim();
    if (isActive !== undefined) shelf.isActive = Boolean(isActive);

    await shelf.save();

    // If shelf name changed, update books assigned to old shelf name
    if (name && name.trim() !== oldName) {
      await Book.updateMany(
        { shelfLocation: oldName, ...(schoolId ? { school: schoolId } : {}) },
        { shelfLocation: name.trim() }
      );
    }

    res.json({
      success: true,
      message: 'Shelf updated successfully',
      data: shelf,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating shelf' });
  }
};

// DELETE /api/shelves/:id
export const deleteShelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const shelf = await Shelf.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!shelf) {
      res.status(404).json({ success: false, message: 'Shelf not found' });
      return;
    }

    const bookCount = await Book.countDocuments({
      shelfLocation: shelf.name,
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (bookCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete shelf. ${bookCount} book(s) are currently located on ${shelf.name}. Please relocate books or deactivate this shelf.`,
      });
      return;
    }

    await Shelf.findOneAndDelete({ _id: id, ...(schoolId ? { school: schoolId } : {}) });

    res.json({
      success: true,
      message: 'Shelf deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting shelf' });
  }
};
