import mongoose, { Schema, Document } from 'mongoose';

export interface ISchoolClass extends Document {
  school?: mongoose.Types.ObjectId | any;
  name: string;
  order: number;
  sections: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolClassSchema = new Schema<ISchoolClass>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    sections: { type: [String], default: ['A', 'B', 'C', 'D'] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SchoolClassSchema.index({ school: 1, name: 1 });

export const SchoolClass = mongoose.model<ISchoolClass>('SchoolClass', SchoolClassSchema);
