import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILostDamageLog extends Document {
  school?: Types.ObjectId | any;
  book: Types.ObjectId | any;
  assignment?: Types.ObjectId | any;
  member?: Types.ObjectId | any;
  type: 'lost' | 'damaged' | 'replaced';
  resolutionType?: 'cash_recovery' | 'book_replaced';
  replacementAccessionNo?: string;
  copiesCount: number;
  fineAmount: number;
  fineStatus: 'none' | 'pending' | 'paid';
  paymentMethod?: string;
  receiptNo?: string;
  reason: string;
  reportedBy?: string;
  source: 'assignment' | 'inventory';
  stockDeducted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LostDamageLogSchema = new Schema<ILostDamageLog>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', index: true },
    type: {
      type: String,
      enum: ['lost', 'damaged', 'replaced'],
      required: true,
      index: true,
    },
    resolutionType: {
      type: String,
      enum: ['cash_recovery', 'book_replaced'],
      default: 'cash_recovery',
    },
    replacementAccessionNo: { type: String, trim: true },
    copiesCount: { type: Number, default: 1, min: 1 },
    fineAmount: { type: Number, default: 0, min: 0 },
    fineStatus: {
      type: String,
      enum: ['none', 'pending', 'paid'],
      default: 'none',
      index: true,
    },
    paymentMethod: { type: String, trim: true },
    receiptNo: { type: String, trim: true },
    reason: { type: String, required: true, trim: true },
    reportedBy: { type: String, default: 'Admin' },
    source: {
      type: String,
      enum: ['assignment', 'inventory'],
      default: 'assignment',
    },
    stockDeducted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const LostDamageLog = mongoose.model<ILostDamageLog>('LostDamageLog', LostDamageLogSchema);
