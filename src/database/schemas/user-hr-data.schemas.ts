import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserHrDataDocument = UserHrData & Document;

@Schema({ timestamps: true })
export class UserHrData {
  // User identification (links to relational DB user)
  @Prop({ required: true, index: true })
  userId: string; // User ID from relational database (UUID)

  @Prop({ required: true, trim: true, index: true })
  userEmail: string; // User's email for quick reference

  // HR Person Data
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ required: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  position: string;

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  department?: string;

  @Prop({ trim: true })
  linkedin?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  additionalInfo?: string;

  // Metadata
  @Prop({ required: true, trim: true })
  source: string;

  @Prop({ required: true, trim: true })
  extractionType: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number, min: 0, max: 1, default: 0.5 })
  confidence: number;

  @Prop({ type: String, enum: ['pending', 'processed', 'failed'], default: 'processed' })
  status: 'pending' | 'processed' | 'failed';

  // Batch tracking
  @Prop({ required: true, index: true })
  batchId: string;

  @Prop({ type: Number, min: 0 })
  chunkIndex?: number;

  @Prop({ type: Number, min: 1 })
  totalChunks?: number;

  // Processing timestamps
  @Prop({ type: Date })
  processingStartedAt?: Date;

  @Prop({ type: Date })
  processingCompletedAt: Date;

  // File information
  @Prop({ trim: true, sparse: true })
  originalFileName?: string;

  @Prop({ type: Number, min: 0, sparse: true })
  fileSize?: number;

  // Cross-reference with master data
  @Prop({ type: String, index: true, sparse: true })
  masterDataId?: string; // Reference to hr_data collection if exists

  @Prop({ type: Boolean, default: false })
  isDuplicateInMaster: boolean; // Flag to indicate if this exists in master data

  // User-specific tags/notes
  @Prop({ trim: true })
  userNotes?: string;

  @Prop({ type: [String], default: [] })
  userTags: string[];

  // Privacy settings
  @Prop({ type: Boolean, default: true })
  isPublic: boolean; // Whether this data can be shared/exported

  @Prop({ type: Date })
  lastAccessedAt?: Date;

  // Timestamps (automatically managed by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserHrDataSchema = SchemaFactory.createForClass(UserHrData);

// Indexes for efficient querying
UserHrDataSchema.index({ userId: 1, email: 1 }); // User + email combination
UserHrDataSchema.index({ userId: 1, batchId: 1 }); // User + batch queries
UserHrDataSchema.index({ userId: 1, company: 1 }); // User + company queries
UserHrDataSchema.index({ userId: 1, position: 1 }); // User + position queries
UserHrDataSchema.index({ userId: 1, createdAt: -1 }); // User + recent data
UserHrDataSchema.index({ masterDataId: 1 }); // Cross-reference with master data
UserHrDataSchema.index({ isDuplicateInMaster: 1 }); // Filter duplicates

// Text search index for user-specific search
UserHrDataSchema.index({ 
  name: 'text', 
  email: 'text', 
  position: 'text', 
  company: 'text', 
  department: 'text', 
  additionalInfo: 'text' 
}, { 
  weights: { 
    name: 10, 
    email: 8, 
    position: 6, 
    company: 5, 
    department: 3, 
    additionalInfo: 1 
  } 
});
