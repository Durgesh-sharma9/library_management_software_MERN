import mongoose, { Schema, Document } from 'mongoose';

export interface IBookCategory extends Document {
  school?: mongoose.Types.ObjectId | any;
  name: string;
  description?: string;
  subCategories: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookCategorySchema = new Schema<IBookCategory>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    subCategories: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BookCategorySchema.index({ school: 1, name: 1 });

export const BookCategory = mongoose.model<IBookCategory>('BookCategory', BookCategorySchema);
