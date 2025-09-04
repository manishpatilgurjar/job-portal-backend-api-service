import { Injectable, Logger } from '@nestjs/common';
import { DatabaseManager } from '../managers/database-manager';
import { UserHrData, UserHrDataDocument, UserHrDataSchema } from '../schemas/user-hr-data.schemas';
import { HrData, HrDataDocument, HrDataSchema } from '../schemas/hr-data.schemas';
import { Model } from 'mongoose';
import { MongoDBConnection } from '../connections/mongodb-connection';

export interface UserHrDataStats {
  totalRecords: number;
  processedRecords: number;
  pendingRecords: number;
  failedRecords: number;
  totalBatches: number;
  uniquePeople: number;
  duplicatesInMaster: number;
  recordsByType: Record<string, number>;
  recordsBySource: Record<string, number>;
  recentActivity: {
    lastUpload: Date | null;
    lastProcessed: Date | null;
  };
}

@Injectable()
export class UserHrDataService {
  private readonly logger = new Logger(UserHrDataService.name);
  private userHrDataModel: Model<UserHrDataDocument>;
  private masterHrDataModel: Model<HrDataDocument>;

  constructor(private databaseManager: DatabaseManager) {
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      const mongoConnection = this.databaseManager.getConnection('mongodb');
      if (mongoConnection) {
        const mongoConn = mongoConnection as MongoDBConnection;
        this.userHrDataModel = mongoConn.getModel<UserHrDataDocument>('UserHrData', UserHrDataSchema);
        this.masterHrDataModel = mongoConn.getModel<HrDataDocument>('HrData', HrDataSchema);
        this.logger.log('✅ User HR Data models initialized successfully');
      } else {
        this.logger.error('❌ MongoDB connection not found');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize User HR Data models:', error.message);
      throw new Error(`User HR Data model initialization failed: ${error.message}`);
    }
  }

  private async ensureModelInitialized(): Promise<void> {
    if (this.userHrDataModel && this.masterHrDataModel) {
      return;
    }
    await this.initializeModels();
  }

  async saveUserHrData(
    userId: number,
    userEmail: string,
    hrDataArray: Partial<UserHrData>[],
    batchId: string
  ): Promise<UserHrDataDocument[]> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`💾 Saving ${hrDataArray.length} HR records for user ${userId}...`);

      // Check for duplicates within user's data and cross-reference with master data
      const uniqueRecords = await this.filterUserDuplicateRecords(userId, hrDataArray);

      if (uniqueRecords.length === 0) {
        this.logger.log(`⚠️ All ${hrDataArray.length} records already exist for user ${userId}, skipping save`);
        return [];
      }

      this.logger.log(`📊 Filtered duplicates: ${hrDataArray.length} -> ${uniqueRecords.length} unique records for user ${userId}`);

      // Add user-specific metadata
      const userRecords = uniqueRecords.map(record => ({
        ...record,
        userId,
        userEmail,
        batchId,
        processingCompletedAt: new Date(),
        lastAccessedAt: new Date(),
      }));

      const savedRecords = await this.userHrDataModel.insertMany(userRecords, { 
        ordered: false // Continue inserting even if some records fail
      });

      this.logger.log(`✅ Successfully saved ${savedRecords.length} HR records for user ${userId}`);
      return savedRecords;
    } catch (error) {
      this.logger.error(`❌ Failed to save user HR data: ${error.message}`);
      throw error;
    }
  }

  private async filterUserDuplicateRecords(
    userId: number,
    hrDataArray: Partial<UserHrData>[]
  ): Promise<Partial<UserHrData>[]> {
    try {
      const uniqueRecords: Partial<UserHrData>[] = [];
      
      for (const record of hrDataArray) {
        // Check for duplicates within user's own data
        const existingUserRecord = await this.userHrDataModel.findOne({
          userId,
          $or: [
            { email: record.email, name: record.name },
            { email: record.email },
            { name: record.name, company: record.company }
          ]
        }).exec();

        if (existingUserRecord) {
          this.logger.debug(`🔄 Skipping duplicate user record: ${record.name} (${record.email}) for user ${userId}`);
          continue;
        }

        // Check if this exists in master data collection
        const masterRecord = await this.masterHrDataModel.findOne({
          $or: [
            { email: record.email, name: record.name },
            { email: record.email },
            { name: record.name, company: record.company }
          ]
        }).exec();

        if (masterRecord) {
          this.logger.debug(`📋 Found in master data: ${record.name} (${record.email}), marking as duplicate`);
          // Still save to user collection but mark as duplicate
          record.isDuplicateInMaster = true;
          record.masterDataId = (masterRecord._id as any).toString();
        } else {
          record.isDuplicateInMaster = false;
        }

        uniqueRecords.push(record);
      }

      return uniqueRecords;
    } catch (error) {
      this.logger.error(`❌ Failed to filter user duplicates: ${error.message}`);
      // If filtering fails, return all records to avoid data loss
      return hrDataArray;
    }
  }

  async getUserHrDataByBatch(userId: number, batchId: string): Promise<UserHrDataDocument[]> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📊 Retrieving HR data for user ${userId}, batch: ${batchId}`);
      
      const data = await this.userHrDataModel
        .find({ userId, batchId })
        .sort({ chunkIndex: 1 })
        .exec();
      
      this.logger.log(`✅ Found ${data.length} records for user ${userId}, batch ${batchId}`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Failed to retrieve user HR data for batch ${batchId}: ${error.message}`);
      throw error;
    }
  }

  async getUserHrDataStats(userId: number): Promise<UserHrDataStats> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📈 Calculating HR data statistics for user ${userId}...`);
      
      const [
        totalRecords,
        processedRecords,
        pendingRecords,
        failedRecords,
        totalBatches,
        uniquePeople,
        duplicatesInMaster,
        recordsByType,
        recordsBySource,
        recentActivity
      ] = await Promise.all([
        this.userHrDataModel.countDocuments({ userId }),
        this.userHrDataModel.countDocuments({ userId, status: 'processed' }),
        this.userHrDataModel.countDocuments({ userId, status: 'pending' }),
        this.userHrDataModel.countDocuments({ userId, status: 'failed' }),
        this.userHrDataModel.distinct('batchId', { userId }).then(batches => batches.length),
        this.userHrDataModel.distinct('email', { userId }).then(emails => emails.length),
        this.userHrDataModel.countDocuments({ userId, isDuplicateInMaster: true }),
        this.userHrDataModel.aggregate([
          { $match: { userId } },
          { $group: { _id: '$extractionType', count: { $sum: 1 } } }
        ]).then(results => 
          results.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        this.userHrDataModel.aggregate([
          { $match: { userId } },
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ]).then(results => 
          results.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        this.userHrDataModel.aggregate([
          { $match: { userId } },
          { $group: {
            _id: null,
            lastUpload: { $max: '$createdAt' },
            lastProcessed: { $max: '$processingCompletedAt' }
          }}
        ]).then(results => results[0] || { lastUpload: null, lastProcessed: null })
      ]);

      const stats: UserHrDataStats = {
        totalRecords,
        processedRecords,
        pendingRecords,
        failedRecords,
        totalBatches,
        uniquePeople,
        duplicatesInMaster,
        recordsByType,
        recordsBySource,
        recentActivity: {
          lastUpload: recentActivity.lastUpload,
          lastProcessed: recentActivity.lastProcessed
        }
      };

      this.logger.log(`✅ Statistics calculated for user ${userId}: ${totalRecords} total records, ${totalBatches} batches`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to calculate user statistics: ${error.message}`);
      throw error;
    }
  }

  async searchUserHrData(userId: number, query: {
    search?: string;
    company?: string;
    position?: string;
    status?: string;
    batchId?: string;
    isDuplicateInMaster?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: UserHrDataDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🔍 Searching HR data for user ${userId} with query: ${JSON.stringify(query)}`);
      
      const filter: any = { userId };
      
      if (query.search) {
        filter.$text = { $search: query.search };
      }
      
      if (query.company) {
        filter.company = { $regex: query.company, $options: 'i' };
      }
      
      if (query.position) {
        filter.position = { $regex: query.position, $options: 'i' };
      }
      
      if (query.status) {
        filter.status = query.status;
      }
      
      if (query.batchId) {
        filter.batchId = query.batchId;
      }

      if (query.isDuplicateInMaster !== undefined) {
        filter.isDuplicateInMaster = query.isDuplicateInMaster;
      }

      const limit = query.limit || 50;
      const offset = query.offset || 0;

      const [data, total] = await Promise.all([
        this.userHrDataModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.userHrDataModel.countDocuments(filter)
      ]);

      this.logger.log(`✅ Search completed for user ${userId}: ${data.length} records found`);
      
      return {
        data,
        total,
        limit,
        offset
      };
    } catch (error) {
      this.logger.error(`❌ Search failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async deleteUserHrDataByBatch(userId: number, batchId: string): Promise<number> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🗑️ Deleting HR data for user ${userId}, batch: ${batchId}`);
      
      const result = await this.userHrDataModel.deleteMany({ userId, batchId }).exec();
      
      this.logger.log(`✅ Deleted ${result.deletedCount} records for user ${userId}, batch ${batchId}`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`❌ Failed to delete user HR data for batch ${batchId}: ${error.message}`);
      throw error;
    }
  }

  async updateUserHrDataStatus(
    userId: number,
    batchId: string, 
    chunkIndex: number, 
    status: 'pending' | 'processed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🔄 Updating status for user ${userId}, batch ${batchId}, chunk ${chunkIndex} to ${status}`);
      
      const updateData: any = { status };
      
      if (status === 'processed') {
        updateData.processingCompletedAt = new Date();
        updateData.lastAccessedAt = new Date();
      } else if (status === 'failed' && errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await this.userHrDataModel.updateMany(
        { userId, batchId, chunkIndex },
        updateData
      ).exec();
      
      this.logger.log(`✅ Status updated successfully for user ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update status for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async checkUserBatchExists(userId: number, batchId: string): Promise<boolean> {
    try {
      await this.ensureModelInitialized();
      const count = await this.userHrDataModel.countDocuments({ userId, batchId }).exec();
      return count > 0;
    } catch (error) {
      this.logger.error(`❌ Failed to check user batch existence: ${error.message}`);
      return false;
    }
  }

  async getUserHrDataById(userId: number, hrDataId: string): Promise<UserHrDataDocument | null> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📊 Retrieving HR data for user ${userId}, ID: ${hrDataId}`);
      
      const data = await this.userHrDataModel.findOne({ 
        _id: hrDataId, 
        userId 
      }).exec();
      
      if (data) {
        this.logger.log(`✅ Found HR data for user ${userId}, ID: ${hrDataId}`);
      } else {
        this.logger.log(`⚠️ No HR data found for user ${userId}, ID: ${hrDataId}`);
      }
      
      return data;
    } catch (error) {
      this.logger.error(`❌ Failed to retrieve HR data for ID ${hrDataId}: ${error.message}`);
      throw error;
    }
  }

  async getAllUserHrData(userId: number, options: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    data: UserHrDataDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📊 Retrieving all HR data for user ${userId}`);
      
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder;

      const [data, total] = await Promise.all([
        this.userHrDataModel
          .find({ userId })
          .sort(sortOptions)
          .skip(offset)
          .limit(limit)
          .exec(),
        this.userHrDataModel.countDocuments({ userId })
      ]);

      this.logger.log(`✅ Retrieved ${data.length} HR records for user ${userId} (total: ${total})`);
      
      return {
        data,
        total,
        limit,
        offset
      };
    } catch (error) {
      this.logger.error(`❌ Failed to retrieve all HR data for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async createManualHrData(userId: number, userEmail: string, hrData: {
    name: string;
    email: string;
    position: string;
    company: string;
    phone?: string;
    location?: string;
    department?: string;
    linkedin?: string;
    website?: string;
    additionalInfo?: string;
    userNotes?: string;
    userTags?: string[];
  }): Promise<UserHrDataDocument> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📝 Creating manual HR data for user ${userId}`);

      // Check for duplicates within user's data
      const duplicateRecord = await this.userHrDataModel.findOne({
        userId,
        $or: [
          { email: hrData.email, name: hrData.name },
          { email: hrData.email },
          { name: hrData.name, company: hrData.company }
        ]
      }).exec();
      
      if (duplicateRecord) {
        this.logger.log(`⚠️ Duplicate record found for user ${userId}, skipping creation`);
        throw new Error('A record with this email and name already exists');
      }

      const manualHrData = {
        ...hrData,
        userId,
        userEmail,
        source: 'manual_entry',
        extractionType: 'manual',
        description: 'Manually added HR data',
        confidence: 1.0, // Manual entries have 100% confidence
        status: 'processed' as const,
        batchId: `manual-${userId}-${Date.now()}`,
        processingCompletedAt: new Date(),
        lastAccessedAt: new Date(),
        isPublic: true,
        userTags: hrData.userTags || [],
      };

      const savedRecord = await this.userHrDataModel.create(manualHrData);
      this.logger.log(`✅ Successfully created manual HR data for user ${userId}: ${savedRecord._id}`);
      
      return savedRecord;
    } catch (error) {
      this.logger.error(`❌ Failed to create manual HR data for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async updateUserHrData(userId: number, hrDataId: string, updateData: {
    name?: string;
    email?: string;
    position?: string;
    company?: string;
    phone?: string;
    location?: string;
    department?: string;
    linkedin?: string;
    website?: string;
    additionalInfo?: string;
    userNotes?: string;
    userTags?: string[];
    isPublic?: boolean;
  }): Promise<UserHrDataDocument | null> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📝 Updating HR data for user ${userId}, ID: ${hrDataId}`);

      // Check if the record belongs to the user
      const existingRecord = await this.userHrDataModel.findOne({ 
        _id: hrDataId, 
        userId 
      }).exec();

      if (!existingRecord) {
        this.logger.log(`⚠️ HR data not found or doesn't belong to user ${userId}, ID: ${hrDataId}`);
        return null;
      }

      // If email or name is being updated, check for duplicates (excluding current record)
      if (updateData.email || updateData.name) {
        const newEmail = updateData.email || existingRecord.email;
        const newName = updateData.name || existingRecord.name;
        const newCompany = updateData.company || existingRecord.company;

        // Check if there's another record with the same email/name (excluding current record)
        const duplicateRecord = await this.userHrDataModel.findOne({
          userId,
          _id: { $ne: hrDataId }, // Exclude current record
          $or: [
            { email: newEmail, name: newName },
            { email: newEmail },
            { name: newName, company: newCompany }
          ]
        }).exec();

        if (duplicateRecord) {
          this.logger.log(`⚠️ Duplicate record would be created for user ${userId}, skipping update`);
          throw new Error('A record with this email and name already exists');
        }
      }

      const updatedRecord = await this.userHrDataModel.findOneAndUpdate(
        { _id: hrDataId, userId },
        { 
          ...updateData,
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      ).exec();

      if (updatedRecord) {
        this.logger.log(`✅ Successfully updated HR data for user ${userId}, ID: ${hrDataId}`);
      }

      return updatedRecord;
    } catch (error) {
      this.logger.error(`❌ Failed to update HR data for user ${userId}, ID: ${hrDataId}: ${error.message}`);
      throw error;
    }
  }

  async deleteUserHrData(userId: number, hrDataId: string): Promise<boolean> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🗑️ Deleting HR data for user ${userId}, ID: ${hrDataId}`);
      
      const result = await this.userHrDataModel.deleteOne({ 
        _id: hrDataId, 
        userId 
      }).exec();
      
      if (result.deletedCount > 0) {
        this.logger.log(`✅ Successfully deleted HR data for user ${userId}, ID: ${hrDataId}`);
        return true;
      } else {
        this.logger.log(`⚠️ HR data not found or doesn't belong to user ${userId}, ID: ${hrDataId}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete HR data for user ${userId}, ID: ${hrDataId}: ${error.message}`);
      throw error;
    }
  }

  async bulkDeleteUserHrData(userId: number, hrDataIds: string[]): Promise<{
    deletedCount: number;
    failedIds: string[];
  }> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🗑️ Bulk deleting ${hrDataIds.length} HR records for user ${userId}`);
      
      const result = await this.userHrDataModel.deleteMany({ 
        _id: { $in: hrDataIds }, 
        userId 
      }).exec();
      
      const failedIds = hrDataIds.filter(id => 
        !result.deletedCount || result.deletedCount === 0
      );

      this.logger.log(`✅ Bulk delete completed for user ${userId}: ${result.deletedCount} deleted, ${failedIds.length} failed`);
      
      return {
        deletedCount: result.deletedCount || 0,
        failedIds
      };
    } catch (error) {
      this.logger.error(`❌ Failed to bulk delete HR data for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
