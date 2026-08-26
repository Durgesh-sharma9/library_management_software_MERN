import { Request, Response } from 'express';
import { BookCategory } from '../models/BookCategory.js';
import { Book } from '../models/Book.js';
import { getRequestSchoolId } from '../middleware/auth.js';

function parseSubCategories(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((item) => item.length > 0)
      )
    );
  }
  if (typeof input === 'string') {
    return Array.from(
      new Set(
        input
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );
  }
  return [];
}

export async function getCategories(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { includeInactive } = req.query;
    const filter: any = {};
    if (schoolId) filter.school = schoolId;
    if (includeInactive !== 'true') filter.isActive = true;

    const categories = await BookCategory.find(filter).sort({ name: 1 });

    // Attach book count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const bookCount = await Book.countDocuments({
          category: cat._id,
          ...(schoolId ? { school: schoolId } : {}),
        });
        return {
          ...cat.toObject(),
          bookCount,
        };
      })
    );

    return res.json({ success: true, data: categoriesWithCount });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { name, description, subCategories, isActive } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const existing = await BookCategory.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const parsedSubCategories = parseSubCategories(subCategories);

    const category = await BookCategory.create({
      school: schoolId,
      name: trimmedName,
      description: description ? description.trim() : '',
      subCategories: parsedSubCategories,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const { name, description, subCategories, isActive } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const existing = await BookCategory.findOne({
      _id: { $ne: id },
      ...(schoolId ? { school: schoolId } : {}),
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Another category with this name already exists' });
    }

    const updatePayload: any = {
      name: trimmedName,
    };
    if (description !== undefined) updatePayload.description = description.trim();
    if (subCategories !== undefined) updatePayload.subCategories = parseSubCategories(subCategories);
    if (typeof isActive === 'boolean') updatePayload.isActive = isActive;

    const category = await BookCategory.findOneAndUpdate(
      { _id: id, ...(schoolId ? { school: schoolId } : {}) },
      updatePayload,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update category' });
  }
}

export async function toggleCategoryStatus(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const category = await BookCategory.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isActive = !category.isActive;
    await category.save();

    return res.json({
      success: true,
      message: `Category marked as ${category.isActive ? 'active' : 'inactive'}`,
      data: category,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to toggle category status' });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    
    // Check if books are using this category
    const bookCount = await Book.countDocuments({
      category: id,
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (bookCount > 0) {
      // Instead of failing hard, deactivate and inform
      await BookCategory.findOneAndUpdate(
        { _id: id, ...(schoolId ? { school: schoolId } : {}) },
        { isActive: false }
      );
      return res.status(400).json({
        success: false,
        message: `Cannot delete this category because ${bookCount} book(s) are using it. It has been deactivated instead.`,
      });
    }

    await BookCategory.findOneAndDelete({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
}
