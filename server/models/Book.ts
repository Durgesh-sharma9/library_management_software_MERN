import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBookCopy {
  copyNumber: number;
  accessionNumber: string;
  status: 'available' | 'assigned' | 'lost' | 'damaged';
  assignedTo?: Types.ObjectId | any;
  assignedToName?: string;
  assignedToId?: string;
  assignedDate?: Date | null;
  dueDate?: Date | null;
  assignmentId?: Types.ObjectId | any;
  shelfLocation?: string;
}

export interface IBook extends Document {
  school?: Types.ObjectId | any;
  accessionNumber?: string;
  title: string;
  author: string;
  language: 'Hindi' | 'English' | 'Other';
  publisher?: string;
  publisherNumber?: string;
  category: Types.ObjectId | any;
  subCategory?: string;
  price?: number;
  supplier?: Types.ObjectId | any;
  shelfLocation?: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  assignedCopies: number;
  lostCopies: number;
  damagedCopies: number;
  copiesList?: IBookCopy[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema = new Schema<IBook>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    accessionNumber: { type: String, trim: true, uppercase: true, default: '', index: true },
    title: { type: String, required: true, trim: true, index: true },
    author: { type: String, required: true, trim: true, index: true },
    language: { type: String, required: true, enum: ['Hindi', 'English', 'Other'], default: 'English' },
    publisher: { type: String, trim: true, default: '' },
    publisherNumber: { type: String, trim: true, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'BookCategory', required: true, index: true },
    subCategory: { type: String, trim: true, default: '', index: true },
    price: { type: Number, min: 0, default: 0 },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true },
    shelfLocation: { type: String, trim: true, default: '', index: true },
    coverImage: { type: String, trim: true, default: '' },
    totalCopies: { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
    assignedCopies: { type: Number, required: true, default: 0, min: 0 },
    lostCopies: { type: Number, default: 0, min: 0 },
    damagedCopies: { type: Number, default: 0, min: 0 },
    copiesList: [
      {
        copyNumber: { type: Number, required: true },
        accessionNumber: { type: String, required: true, trim: true, uppercase: true },
        status: {
          type: String,
          enum: ['available', 'assigned', 'lost', 'damaged'],
          default: 'available',
        },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
        assignedToName: { type: String, default: '' },
        assignedToId: { type: String, default: '' },
        assignedDate: { type: Date, default: null },
        dueDate: { type: Date, default: null },
        assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', default: null },
        shelfLocation: { type: String, default: '' },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Ensure consistency
BookSchema.pre('validate', function () {
  if (this.totalCopies !== undefined && this.assignedCopies !== undefined) {
    if (this.availableCopies === undefined || this.isNew) {
      this.availableCopies = Math.max(0, this.totalCopies - (this.assignedCopies || 0) - (this.lostCopies || 0) - (this.damagedCopies || 0));
    }
  }
});

BookSchema.index({ school: 1, accessionNumber: 1 });
BookSchema.index({ school: 1, title: 1 });

export const Book = mongoose.model<IBook>('Book', BookSchema);
