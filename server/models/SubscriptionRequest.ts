import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionRequest extends Document {
  school: mongoose.Types.ObjectId | any;
  plan: mongoose.Types.ObjectId | any;
  requestedBy: mongoose.Types.ObjectId | any;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  durationDays: number;
  amount: number;
  paymentMode: 'upi' | 'bank_transfer' | 'cheque' | 'cash' | 'online' | 'po' | 'razorpay';
  transactionReference: string;
  paymentReceiptUrl?: string;
  schoolNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId | any;
  reviewedAt?: Date;
  adminRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionRequestSchema = new Schema<ISubscriptionRequest>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'yearly',
    },
    durationDays: { type: Number, default: 365 },
    amount: { type: Number, required: true },
    paymentMode: {
      type: String,
      enum: ['upi', 'bank_transfer', 'cheque', 'cash', 'online', 'po', 'razorpay'],
      default: 'upi',
    },
    transactionReference: { type: String, trim: true, default: '' },
    paymentReceiptUrl: { type: String, default: '' },
    schoolNotes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminRemarks: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SubscriptionRequest = mongoose.model<ISubscriptionRequest>(
  'SubscriptionRequest',
  SubscriptionRequestSchema
);
