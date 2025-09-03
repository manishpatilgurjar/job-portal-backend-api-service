import { Schema, Document } from 'mongoose';

/**
 * Application Schema for MongoDB
 */
export interface IApplication extends Document {
  jobId: string;
  userId: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'accepted' | 'rejected';
  coverLetter?: string;
  resume?: {
    filename: string;
    url: string;
    uploadedAt: Date;
  };
  portfolio?: {
    website?: string;
    github?: string;
    linkedin?: string;
    other?: string[];
  };
  answers?: {
    questionId: string;
    answer: string;
  }[];
  notes?: {
    addedBy: string; // User ID
    note: string;
    addedAt: Date;
  }[];
  interviewSchedule?: {
    scheduledAt: Date;
    type: 'phone' | 'video' | 'in_person';
    location?: string;
    meetingLink?: string;
    interviewer?: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  }[];
  appliedAt: Date;
  updatedAt: Date;
}

export const ApplicationSchema = new Schema<IApplication>({
  jobId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected'],
    default: 'pending',
    index: true 
  },
  coverLetter: String,
  resume: {
    filename: String,
    url: String,
    uploadedAt: Date,
  },
  portfolio: {
    website: String,
    github: String,
    linkedin: String,
    other: [String],
  },
  answers: [{
    questionId: String,
    answer: String,
  }],
  notes: [{
    addedBy: String,
    note: String,
    addedAt: { type: Date, default: Date.now },
  }],
  interviewSchedule: [{
    scheduledAt: Date,
    type: { type: String, enum: ['phone', 'video', 'in_person'] },
    location: String,
    meetingLink: String,
    interviewer: String,
    status: { 
      type: String, 
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled' 
    },
  }],
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for better performance
ApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true }); // Prevent duplicate applications
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ status: 1, appliedAt: -1 });
ApplicationSchema.index({ appliedAt: -1 });

// Update the updatedAt field before saving
ApplicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});
