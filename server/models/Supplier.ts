import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  school?: mongoose.Types.ObjectId | any;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    name: { type: String, required: true, trim: true, index: true },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gstNumber: { type: String, trim: true, uppercase: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ school: 1, name: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
