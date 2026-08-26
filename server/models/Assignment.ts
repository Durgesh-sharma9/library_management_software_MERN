import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFineBreakdownItem {
  fromDate: string;
  toDate: string;
  days: number;
  ratePerDay: number;
  amount: number;
}

export interface IReissueHistoryItem {
  reissuedAt: Date;
  previousDueDate: Date;
  newDueDate: Date;
  remarks?: string;
}

export interface IAssignment extends Document {
  school?: Types.ObjectId | any;
  member: Types.ObjectId | any;
  book: Types.ObjectId | any;
  copyNumber?: number;
  accessionNumber?: string;
  assignedDate: Date;
  dueDate: Date;
  originalDueDate?: Date;
  returnedDate?: Date | null;
  status: 'assigned' | 'returned' | 'overdue' | 'lost' | 'damaged' | 'replaced';
  lostOrDamaged?: 'lost' | 'damaged' | 'replaced' | null;
  damageOrLostFine?: number;
  damageOrLostReason?: string;
  damageOrLostDate?: Date | null;
  fineAmount: number;
  originalFine?: number;
  waivedAmount?: number;
  fineStatus: 'none' | 'pending' | 'paid';
  fineBreakdown?: IFineBreakdownItem[];
  reissueCount?: number;
  reissueHistory?: IReissueHistoryItem[];
  receiptNo?: string;
  paymentMethod?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    copyNumber: { type: Number, default: 1 },
    accessionNumber: { type: String, trim: true, uppercase: true, default: '', index: true },
    assignedDate: { type: Date, required: true, default: Date.now, index: true },
    dueDate: { type: Date, required: true, index: true },
    originalDueDate: { type: Date },
    returnedDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['assigned', 'returned', 'overdue', 'lost', 'damaged', 'replaced'],
      default: 'assigned',
      index: true,
    },
    lostOrDamaged: {
      type: String,
      enum: ['lost', 'damaged', 'replaced', null],
      default: null,
      index: true,
    },
    damageOrLostFine: { type: Number, default: 0 },
    damageOrLostReason: { type: String, default: '' },
    damageOrLostDate: { type: Date, default: null },
    fineAmount: { type: Number, default: 0, min: 0 },
    originalFine: { type: Number, default: 0 },
    waivedAmount: { type: Number, default: 0 },
    fineStatus: {
      type: String,
      enum: ['none', 'pending', 'paid'],
      default: 'none',
      index: true,
    },
    fineBreakdown: [
      {
        fromDate: String,
        toDate: String,
        days: Number,
        ratePerDay: Number,
        amount: Number,
      },
    ],
    reissueCount: { type: Number, default: 0 },
    reissueHistory: [
      {
        reissuedAt: { type: Date, default: Date.now },
        previousDueDate: Date,
        newDueDate: Date,
        remarks: String,
      },
    ],
    receiptNo: { type: String, trim: true },
    paymentMethod: { type: String, trim: true },
    remarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
