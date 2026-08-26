import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier.js';
import { Book } from '../models/Book.js';
import { getRequestSchoolId } from '../middleware/auth.js';

// GET /api/suppliers
export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const filter: any = {};
    if (schoolId) filter.school = schoolId;

    const suppliers = await Supplier.find(filter).sort({ name: 1 });

    // Aggregate book counts and spend per supplier
    const supplierStats = await Book.aggregate([
      {
        $match: {
          supplier: { $ne: null },
          ...(schoolId ? { school: schoolId } : {}),
        },
      },
      {
        $group: {
          _id: '$supplier',
          booksCount: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          totalSpend: {
            $sum: {
              $multiply: [{ $ifNull: ['$price', 0] }, '$totalCopies'],
            },
          },
        },
      },
    ]);

    const statsMap = new Map<string, { booksCount: number; totalCopies: number; totalSpend: number }>();
    supplierStats.forEach((stat) => {
      if (stat._id) {
        statsMap.set(stat._id.toString(), {
          booksCount: stat.booksCount,
          totalCopies: stat.totalCopies,
          totalSpend: stat.totalSpend,
        });
      }
    });

    const enriched = suppliers.map((sup) => {
      const stats = statsMap.get(sup._id.toString()) || { booksCount: 0, totalCopies: 0, totalSpend: 0 };
      return {
        ...sup.toObject(),
        booksCount: stats.booksCount,
        totalCopies: stats.totalCopies,
        totalSpend: stats.totalSpend,
      };
    });

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching suppliers' });
  }
};

// POST /api/suppliers
export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const { name, contactPerson, phone, email, address, gstNumber, notes, isActive } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Supplier name is required' });
      return;
    }

    const existing = await Supplier.findOne({
      ...(schoolId ? { school: schoolId } : {}),
      name: name.trim(),
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Supplier with this name already exists' });
      return;
    }

    const supplier = await Supplier.create({
      school: schoolId,
      name: name.trim(),
      contactPerson: contactPerson?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      address: address?.trim() || '',
      gstNumber: gstNumber?.trim() || '',
      notes: notes?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating supplier' });
  }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const { name, contactPerson, phone, email, address, gstNumber, notes, isActive } = req.body;

    const supplier = await Supplier.findOne({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    if (name && name.trim() !== supplier.name) {
      const existing = await Supplier.findOne({
        name: name.trim(),
        _id: { $ne: id },
        ...(schoolId ? { school: schoolId } : {}),
      });
      if (existing) {
        res.status(400).json({ success: false, message: 'Supplier with this name already exists' });
        return;
      }
      supplier.name = name.trim();
    }

    if (contactPerson !== undefined) supplier.contactPerson = contactPerson.trim();
    if (phone !== undefined) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email.trim();
    if (address !== undefined) supplier.address = address.trim();
    if (gstNumber !== undefined) supplier.gstNumber = gstNumber.trim();
    if (notes !== undefined) supplier.notes = notes.trim();
    if (isActive !== undefined) supplier.isActive = Boolean(isActive);

    await supplier.save();

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating supplier' });
  }
};

// DELETE /api/suppliers/:id
export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = getRequestSchoolId(req);
    const { id } = req.params;
    const bookCount = await Book.countDocuments({
      supplier: id,
      ...(schoolId ? { school: schoolId } : {}),
    });
    if (bookCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete supplier. ${bookCount} book(s) are linked to this supplier. Deactivate instead.`,
      });
      return;
    }

    const supplier = await Supplier.findOneAndDelete({ _id: id, ...(schoolId ? { school: schoolId } : {}) });
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting supplier' });
  }
};
