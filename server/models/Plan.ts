import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  code: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  maxBooks: number; // -1 for unlimited
  maxMembers: number; // -1 for unlimited
  maxIssuedPerStudent: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, default: 0 },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'yearly',
    },
    maxBooks: { type: Number, default: 2000 },
    maxMembers: { type: Number, default: 500 },
    maxIssuedPerStudent: { type: Number, default: 3 },
    features: [{ type: String }],
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan = mongoose.model<IPlan>('Plan', PlanSchema);
