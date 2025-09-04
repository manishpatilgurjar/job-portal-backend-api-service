import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HrDataDocument = HrData & Document;

@Schema({ timestamps: true })
export class HrData {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  position?: string;

  @Prop({ required: false })
  company?: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ required: false })
  department?: string;

  @Prop({ required: false })
  linkedin?: string;

  @Prop({ required: false })
  website?: string;

  @Prop({ required: false })
  additionalInfo?: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  extractionType: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true, default: 0.8 })
  confidence: number;

  @Prop({ required: true, default: 'pending' })
  status: 'pending' | 'processed' | 'failed';

  @Prop({ required: false })
  batchId?: string;

  @Prop({ required: false })
  chunkIndex?: number;

  @Prop({ required: false })
  totalChunks?: number;

  @Prop({ required: false })
  processingStartedAt?: Date;

  @Prop({ required: false })
  processingCompletedAt?: Date;

  @Prop({ required: false })
  errorMessage?: string;
}

export const HrDataSchema = SchemaFactory.createForClass(HrData);

// Create indexes for better performance
HrDataSchema.index({ email: 1 });
HrDataSchema.index({ company: 1 });
HrDataSchema.index({ status: 1 });
HrDataSchema.index({ batchId: 1 });
HrDataSchema.index({ createdAt: -1 });
