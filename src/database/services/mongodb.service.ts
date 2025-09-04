import { Injectable, Logger } from '@nestjs/common';
import { DatabaseManager } from '../managers/database-manager';
import { HrData, HrDataDocument, HrDataSchema } from '../schemas/hr-data.schemas';
import { Model } from 'mongoose';
import { MongoDBConnection } from '../connections/mongodb-connection';

@Injectable()
export class MongoDBService {
  private readonly logger = new Logger(MongoDBService.name);
  private hrDataModel: Model<HrDataDocument>;

  constructor(private databaseManager: DatabaseManager) {
    // Don't initialize models in constructor - do it lazily
  }

  private async ensureModelInitialized(): Promise<void> {
    if (this.hrDataModel) {
      return; // Already initialized
    }

    try {
      const mongoConnection = this.databaseManager.getConnection('mongodb');
      if (mongoConnection) {
        // Cast to MongoDBConnection to access getModel method
        const mongoConn = mongoConnection as MongoDBConnection;
        this.hrDataModel = mongoConn.getModel<HrDataDocument>('HrData', HrDataSchema);
        this.logger.log('✅ HR Data model initialized successfully');
      } else {
        throw new Error('MongoDB connection not found');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize MongoDB models:', error.message);
      throw new Error(`MongoDB model initialization failed: ${error.message}`);
    }
  }

  async saveHrData(hrDataArray: Partial<HrData>[]): Promise<HrDataDocument[]> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`💾 Saving ${hrDataArray.length} HR records to MongoDB...`);
      
      // Check for duplicates before saving
      const uniqueRecords = await this.filterDuplicateRecords(hrDataArray);
      
      if (uniqueRecords.length === 0) {
        this.logger.log(`⚠️ All ${hrDataArray.length} records already exist, skipping save`);
        return [];
      }
      
      this.logger.log(`📊 Filtered duplicates: ${hrDataArray.length} -> ${uniqueRecords.length} unique records`);
      
      const savedRecords = await this.hrDataModel.insertMany(uniqueRecords, { 
        ordered: false // Continue inserting even if some records fail
      });
      
      this.logger.log(`✅ Successfully saved ${savedRecords.length} HR records`);
      return savedRecords;
    } catch (error) {
      this.logger.error(`❌ Failed to save HR data: ${error.message}`);
      throw error;
    }
  }

  private async filterDuplicateRecords(hrDataArray: Partial<HrData>[]): Promise<Partial<HrData>[]> {
    try {
      const uniqueRecords: Partial<HrData>[] = [];
      
      for (const record of hrDataArray) {
        // Check for duplicates based on email and name combination
        const existingRecord = await this.hrDataModel.findOne({
          $or: [
            { email: record.email, name: record.name },
            { email: record.email },
            { name: record.name, company: record.company }
          ]
        }).exec();
        
        if (!existingRecord) {
          uniqueRecords.push(record);
        } else {
          this.logger.debug(`🔄 Skipping duplicate record: ${record.name} (${record.email})`);
        }
      }
      
      return uniqueRecords;
    } catch (error) {
      this.logger.error(`❌ Failed to filter duplicates: ${error.message}`);
      // If filtering fails, return all records to avoid data loss
      return hrDataArray;
    }
  }

  async checkBatchExists(batchId: string): Promise<boolean> {
    try {
      await this.ensureModelInitialized();
      const count = await this.hrDataModel.countDocuments({ batchId }).exec();
      return count > 0;
    } catch (error) {
      this.logger.error(`❌ Failed to check batch existence: ${error.message}`);
      return false;
    }
  }

  async getHrDataByBatch(batchId: string): Promise<HrDataDocument[]> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`📊 Retrieving HR data for batch: ${batchId}`);
      
      const data = await this.hrDataModel.find({ batchId }).sort({ chunkIndex: 1 }).exec();
      
      this.logger.log(`✅ Found ${data.length} records for batch ${batchId}`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Failed to retrieve HR data for batch ${batchId}: ${error.message}`);
      throw error;
    }
  }

  async getHrDataStats(): Promise<{
    totalRecords: number;
    processedRecords: number;
    pendingRecords: number;
    failedRecords: number;
    totalBatches: number;
    recordsByType: Record<string, number>;
    recordsBySource: Record<string, number>;
  }> {
    try {
      await this.ensureModelInitialized();
      this.logger.log('📈 Calculating HR data statistics...');
      
      const [
        totalRecords,
        processedRecords,
        pendingRecords,
        failedRecords,
        totalBatches,
        recordsByType,
        recordsBySource
      ] = await Promise.all([
        this.hrDataModel.countDocuments(),
        this.hrDataModel.countDocuments({ status: 'processed' }),
        this.hrDataModel.countDocuments({ status: 'pending' }),
        this.hrDataModel.countDocuments({ status: 'failed' }),
        this.hrDataModel.distinct('batchId').then(batches => batches.length),
        this.hrDataModel.aggregate([
          { $group: { _id: '$extractionType', count: { $sum: 1 } } }
        ]).then(results => 
          results.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        this.hrDataModel.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ]).then(results => 
          results.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        )
      ]);

      const stats = {
        totalRecords,
        processedRecords,
        pendingRecords,
        failedRecords,
        totalBatches,
        recordsByType,
        recordsBySource
      };

      this.logger.log(`✅ Statistics calculated: ${totalRecords} total records, ${totalBatches} batches`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to calculate statistics: ${error.message}`);
      throw error;
    }
  }

  async searchHrData(query: {
    search?: string;
    company?: string;
    position?: string;
    status?: string;
    batchId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: HrDataDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🔍 Searching HR data with query: ${JSON.stringify(query)}`);
      
      const filter: any = {};
      
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

      const limit = query.limit || 50;
      const offset = query.offset || 0;

      const [data, total] = await Promise.all([
        this.hrDataModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.hrDataModel.countDocuments(filter)
      ]);

      this.logger.log(`✅ Search completed: ${data.length} records found`);
      
      return {
        data,
        total,
        limit,
        offset
      };
    } catch (error) {
      this.logger.error(`❌ Search failed: ${error.message}`);
      throw error;
    }
  }

  async updateHrDataStatus(
    batchId: string, 
    chunkIndex: number, 
    status: 'pending' | 'processed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🔄 Updating status for batch ${batchId}, chunk ${chunkIndex} to ${status}`);
      
      const updateData: any = { status };
      
      if (status === 'processed') {
        updateData.processingCompletedAt = new Date();
      } else if (status === 'failed' && errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await this.hrDataModel.updateMany(
        { batchId, chunkIndex },
        updateData
      ).exec();
      
      this.logger.log(`✅ Status updated successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to update status: ${error.message}`);
      throw error;
    }
  }

  async deleteHrDataByBatch(batchId: string): Promise<number> {
    try {
      await this.ensureModelInitialized();
      this.logger.log(`🗑️ Deleting HR data for batch: ${batchId}`);
      
      const result = await this.hrDataModel.deleteMany({ batchId }).exec();
      
      this.logger.log(`✅ Deleted ${result.deletedCount} records for batch ${batchId}`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`❌ Failed to delete HR data for batch ${batchId}: ${error.message}`);
      throw error;
    }
  }
}
