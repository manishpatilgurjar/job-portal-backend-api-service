import { Schema, Document } from 'mongoose';

/**
 * User Schema for MongoDB
 */
export interface IUser extends Document {
  email: string;
  firstName: string;
  lastName: string;
  role: 'job_seeker' | 'employer' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  profile?: {
    phone?: string;
    location?: string;
    bio?: string;
    skills?: string[];
    experience?: string;
    education?: string;
  };
  preferences?: {
    jobTypes?: string[];
    locations?: string[];
    salaryRange?: {
      min: number;
      max: number;
    };
    notifications?: {
      email: boolean;
      push: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['job_seeker', 'employer', 'admin'],
    index: true 
  },
  isActive: { type: Boolean, default: true, index: true },
  isVerified: { type: Boolean, default: false, index: true },
  profile: {
    phone: String,
    location: String,
    bio: String,
    skills: [String],
    experience: String,
    education: String,
  },
  preferences: {
    jobTypes: [String],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number,
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
});

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ 'profile.location': 1 });
UserSchema.index({ 'profile.skills': 1 });
UserSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});
