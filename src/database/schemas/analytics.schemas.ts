import { Schema, Document } from 'mongoose';

/**
 * User Activity Schema
 */
export interface IUserActivity extends Document {
  userId: string;
  action: string;
  resource: string;
  metadata?: any;
  timestamp: Date;
  createdAt: Date;
}

export const UserActivitySchema = new Schema<IUserActivity>({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for better performance
UserActivitySchema.index({ userId: 1, timestamp: -1 });
UserActivitySchema.index({ action: 1, timestamp: -1 });

/**
 * Job View Schema
 */
export interface IJobView extends Document {
  jobId: string;
  userId?: string;
  metadata?: any;
  timestamp: Date;
  createdAt: Date;
}

export const JobViewSchema = new Schema<IJobView>({
  jobId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for better performance
JobViewSchema.index({ jobId: 1, timestamp: -1 });
JobViewSchema.index({ userId: 1, timestamp: -1 });

/**
 * Application Event Schema
 */
export interface IApplicationEvent extends Document {
  applicationId: string;
  event: string;
  userId: string;
  jobId: string;
  metadata?: any;
  timestamp: Date;
  createdAt: Date;
}

export const ApplicationEventSchema = new Schema<IApplicationEvent>({
  applicationId: { type: String, required: true, index: true },
  event: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  jobId: { type: String, required: true, index: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for better performance
ApplicationEventSchema.index({ applicationId: 1, timestamp: -1 });
ApplicationEventSchema.index({ userId: 1, timestamp: -1 });
ApplicationEventSchema.index({ jobId: 1, timestamp: -1 });

/**
 * Search Analytics Schema
 */
export interface ISearchAnalytics extends Document {
  query: string;
  filters?: any;
  resultsCount: number;
  userId?: string;
  timestamp: Date;
  createdAt: Date;
}

export const SearchAnalyticsSchema = new Schema<ISearchAnalytics>({
  query: { type: String, required: true, index: true },
  filters: { type: Schema.Types.Mixed },
  resultsCount: { type: Number, required: true },
  userId: { type: String, index: true },
  timestamp: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for better performance
SearchAnalyticsSchema.index({ query: 1, timestamp: -1 });
SearchAnalyticsSchema.index({ userId: 1, timestamp: -1 });