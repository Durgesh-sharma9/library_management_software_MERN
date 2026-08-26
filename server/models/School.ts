import mongoose, { Schema, Document } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  code: string;
  libraryName: string;
  adminName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  deactivationReason?: string;
  plan?: mongoose.Types.ObjectId | any;
  planExpiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    libraryName: { type: String, required: true, trim: true },
    adminName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    logoUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'active',
    },
    deactivationReason: { type: String, default: '' },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan' },
    planExpiresAt: { type: Date },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const School = mongoose.model<ISchool>('School', SchoolSchema);
