import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingRegistration extends Document {
  email: string;
  otp: string;
  otpExpiresAt: Date;
  registrationData: {
    schoolName: string;
    libraryName?: string;
    schoolCode?: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  createdAt: Date;
}

const PendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    registrationData: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const PendingRegistration = mongoose.model<IPendingRegistration>(
  'PendingRegistration',
  PendingRegistrationSchema
);
