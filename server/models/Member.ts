import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
  school?: mongoose.Types.ObjectId | any;
  memberId: string;
  memberType: 'student' | 'teacher';
  name: string;
  whatsapp: string;
  email?: string;
  className?: string;
  section?: string;
  designation?: string;
  department?: string;
  admissionNo?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    memberId: { type: String, required: true, uppercase: true, trim: true, index: true },
    memberType: { type: String, enum: ['student', 'teacher'], default: 'student', index: true },
    name: { type: String, required: true, trim: true, index: true },
    whatsapp: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    className: { type: String, trim: true, default: '' },
    section: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    admissionNo: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true }
);

MemberSchema.index({ school: 1, memberId: 1 });

export const Member = mongoose.model<IMember>('Member', MemberSchema);
