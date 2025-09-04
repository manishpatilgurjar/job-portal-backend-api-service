import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HrDataDocument = HrData & Document;

@Schema({ 
  timestamps: true,
  collection: 'hr_data',
  versionKey: false
})
export class HrData {
  @Prop({ 
    required: true, 
    trim: true,
    maxlength: 255,
    index: true
  })
  name: string;

  @Prop({ 
    required: false, 
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true
  })
  email?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 255
  })
  position?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 255,
    index: true
  })
  company?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 50
  })
  phone?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 255
  })
  location?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 255
  })
  department?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 500,
    match: /^https?:\/\/.+/
  })
  linkedin?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 500,
    match: /^https?:\/\/.+/
  })
  website?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 1000
  })
  additionalInfo?: string;

  @Prop({ 
    required: true, 
    trim: true,
    maxlength: 255,
    index: true
  })
  source: string;

  @Prop({ 
    required: true, 
    trim: true,
    maxlength: 100,
    index: true
  })
  extractionType: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 500
  })
  description?: string;

  @Prop({ 
    required: true, 
    default: 0.8,
    min: 0,
    max: 1,
    index: true
  })
  confidence: number;

  @Prop({ 
    required: true, 
    default: 'pending',
    enum: ['pending', 'processed', 'failed'],
    index: true
  })
  status: 'pending' | 'processed' | 'failed';

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 100,
    index: true
  })
  batchId?: string;

  @Prop({ 
    required: false, 
    min: 0
  })
  chunkIndex?: number;

  @Prop({ 
    required: false, 
    min: 1
  })
  totalChunks?: number;

  @Prop({ 
    required: false 
  })
  processingStartedAt?: Date;

  @Prop({ 
    required: false 
  })
  processingCompletedAt?: Date;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 1000
  })
  errorMessage?: string;

  @Prop({ 
    required: false, 
    trim: true,
    maxlength: 100
  })
  originalFileName?: string;

  @Prop({ 
    required: false, 
    min: 0
  })
  fileSize?: number;
}

export const HrDataSchema = SchemaFactory.createForClass(HrData);

// Create compound indexes for better performance
HrDataSchema.index({ email: 1, company: 1 });
HrDataSchema.index({ status: 1, batchId: 1 });
HrDataSchema.index({ createdAt: -1, status: 1 });
HrDataSchema.index({ extractionType: 1, status: 1 });
HrDataSchema.index({ batchId: 1, chunkIndex: 1 });

// Create text index for search
HrDataSchema.index({
  name: 'text',
  position: 'text',
  company: 'text',
  department: 'text',
  additionalInfo: 'text'
});

// Pre-save middleware to set processing times
HrDataSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'processed' && !this.processingCompletedAt) {
    this.processingCompletedAt = new Date();
  }
  next();
});
