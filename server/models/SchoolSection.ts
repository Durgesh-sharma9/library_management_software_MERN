import mongoose, { Schema, Document } from 'mongoose';

export interface ISchoolSection extends Document {
  school?: mongoose.Types.ObjectId | any;
  name: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSectionSchema = new Schema<ISchoolSection>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    name: { type: String, required: true, uppercase: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SchoolSectionSchema.index({ school: 1, name: 1 });

export const SchoolSection = mongoose.model<ISchoolSection>('SchoolSection', SchoolSectionSchema);
