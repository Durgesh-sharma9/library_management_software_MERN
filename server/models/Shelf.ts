import mongoose, { Schema, Document } from 'mongoose';

export interface IShelf extends Document {
  school?: mongoose.Types.ObjectId | any;
  name: string;
  floorOrRoom?: string;
  capacity?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShelfSchema = new Schema<IShelf>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    name: { type: String, required: true, trim: true, index: true },
    floorOrRoom: { type: String, trim: true, default: '' },
    capacity: { type: Number, min: 0, default: 100 },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ShelfSchema.index({ school: 1, name: 1 });

export const Shelf = mongoose.model<IShelf>('Shelf', ShelfSchema);
