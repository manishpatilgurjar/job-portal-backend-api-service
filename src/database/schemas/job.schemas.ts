import { Schema, Document } from 'mongoose';

/**
 * Job Schema for MongoDB
 */
export interface IJob extends Document {
  title: string;
  description: string;
  companyId: string;
  companyName: string;
  location: {
    city: string;
    state: string;
    country: string;
    remote?: boolean;
  };
  type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
  category: string;
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  salary?: {
    min: number;
    max: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  requirements: {
    skills: string[];
    experience?: string;
    education?: string;
    certifications?: string[];
  };
  benefits: string[];
  applicationDeadline?: Date;
  isActive: boolean;
  isFeatured: boolean;
  views: number;
  applications: number;
  postedBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export const JobSchema = new Schema<IJob>({
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  companyName: { type: String, required: true, index: true },
  location: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    remote: { type: Boolean, default: false },
  },
  type: { 
    type: String, 
    required: true, 
    enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
    index: true 
  },
  category: { type: String, required: true, index: true },
  level: { 
    type: String, 
    required: true, 
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    index: true 
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' },
    period: { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' },
  },
  requirements: {
    skills: [String],
    experience: String,
    education: String,
    certifications: [String],
  },
  benefits: [String],
  applicationDeadline: Date,
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  views: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  postedBy: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for better performance
JobSchema.index({ title: 'text', description: 'text' }); // Text search
JobSchema.index({ companyId: 1, isActive: 1 });
JobSchema.index({ 'location.city': 1, 'location.state': 1 });
JobSchema.index({ type: 1, level: 1, isActive: 1 });
JobSchema.index({ category: 1, isActive: 1 });
JobSchema.index({ 'requirements.skills': 1 });
JobSchema.index({ isFeatured: 1, isActive: 1, createdAt: -1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ applicationDeadline: 1, isActive: 1 });

// Update the updatedAt field before saving
JobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});
