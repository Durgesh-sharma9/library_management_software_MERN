import mongoose, { Schema, Document } from 'mongoose';

export interface IFineRule {
  effectiveDate: Date;
  finePerDay: number;
  note?: string;
}

export interface ILibrarySetting extends Document {
  school?: mongoose.Types.ObjectId | any;
  libraryName: string;
  schoolName?: string;
  issueDuration: number; // in days, e.g. 14
  finePerDay: number; // e.g. ₹2 (latest active rate)
  fineEffectiveDate?: Date; // e.g. 2026-08-01
  fineRules: IFineRule[]; // Historical and scheduled fine rate slabs
  maxBooksPerMember: number; // e.g. 3 books limit
  accessionPrefix: string; // e.g. "ACC", "PCC", "LIB"
  accessionStartNumber: number; // e.g. 1, 100, 1001
  accessionPadding: number; // e.g. 4 -> "0001"
  accessionSeparator: string; // e.g. "-" or "" or "/"
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  updatedAt: Date;
}

const FineRuleSchema = new Schema<IFineRule>(
  {
    effectiveDate: { type: Date, required: true },
    finePerDay: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const LibrarySettingSchema = new Schema<ILibrarySetting>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    libraryName: { type: String, required: true, default: 'School Central Library' },
    schoolName: { type: String, default: 'International Public School' },
    issueDuration: { type: Number, required: true, default: 14, min: 1 },
    finePerDay: { type: Number, required: true, default: 2, min: 0 },
    fineEffectiveDate: { type: Date, default: () => new Date('2020-01-01') },
    fineRules: {
      type: [FineRuleSchema],
      default: () => [
        {
          effectiveDate: new Date('2020-01-01'),
          finePerDay: 2,
          note: 'Initial default rate',
        },
      ],
    },
    maxBooksPerMember: { type: Number, required: true, default: 3, min: 1 },
    accessionPrefix: { type: String, required: true, default: 'ACC', trim: true },
    accessionStartNumber: { type: Number, required: true, default: 1, min: 0 },
    accessionPadding: { type: Number, required: true, default: 4, min: 1, max: 10 },
    accessionSeparator: { type: String, default: '-' },
    contactEmail: { type: String, default: 'library@school.edu' },
    contactPhone: { type: String, default: '+91 98765 43210' },
    currency: { type: String, default: '₹' },
  },
  { timestamps: true }
);

export const LibrarySetting = mongoose.model<ILibrarySetting>('LibrarySetting', LibrarySettingSchema);
