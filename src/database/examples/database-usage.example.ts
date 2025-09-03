import { Injectable } from '@nestjs/common';
import { DatabaseManager } from '../managers/database-manager';
import { Model } from 'mongoose';
import { IJob, JobSchema } from '../schemas/job.schemas';

/**
 * Example service showing how to use both PostgreSQL and MongoDB
 * This is just an example - you can delete this file if not needed
 */
@Injectable()
export class DatabaseUsageExample {
  private jobModel: Model<IJob>;

  constructor(private databaseManager: DatabaseManager) {
    // Get MongoDB connection and create model
    const mongoConnection = this.databaseManager.getMongoDBConnection();
    this.jobModel = mongoConnection.getModel<IJob>('Job', JobSchema);
  }

  /**
   * Example: Create a user in PostgreSQL
   */
  async createUser(userData: any) {
    const postgresConnection = this.databaseManager.getPostgreSQLConnection();
    
    const result = await postgresConnection.executeQuery(`
      INSERT INTO users (email, password_hash, first_name, last_name, user_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, created_at
    `, [
      userData.email,
      userData.passwordHash,
      userData.firstName,
      userData.lastName,
      userData.userType || 'job_seeker'
    ]);

    return result[0];
  }

  /**
   * Example: Get user from PostgreSQL
   */
  async getUserById(userId: string) {
    const postgresConnection = this.databaseManager.getPostgreSQLConnection();
    
    const result = await postgresConnection.executeQuery(`
      SELECT * FROM users WHERE id = $1
    `, [userId]);

    return result[0];
  }

  /**
   * Example: Create a job in MongoDB
   */
  async createJob(jobData: any) {
    const job = new this.jobModel({
      title: jobData.title,
      description: jobData.description,
      companyId: jobData.companyId,
      companyName: jobData.companyName,
      location: jobData.location,
      type: jobData.type,
      category: jobData.category,
      level: jobData.level,
      salary: jobData.salary,
      requirements: jobData.requirements,
      benefits: jobData.benefits,
      postedBy: jobData.postedBy,
      isActive: true
    });

    return await job.save();
  }

  /**
   * Example: Search jobs in MongoDB
   */
  async searchJobs(searchTerm: string, filters: any = {}) {
    const query: any = {
      isActive: true,
      ...filters
    };

    if (searchTerm) {
      query.$text = { $search: searchTerm };
    }

    return await this.jobModel.find(query)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(20)
      .exec();
  }

  /**
   * Example: Get job statistics
   */
  async getJobStats() {
    const postgresConnection = this.databaseManager.getPostgreSQLConnection();
    
    // Get user count from PostgreSQL
    const userCountResult = await postgresConnection.executeQuery(`
      SELECT COUNT(*) as total_users FROM users WHERE is_active = true
    `);
    
    // Get job count from MongoDB
    const jobCount = await this.jobModel.countDocuments({ isActive: true });
    
    return {
      totalUsers: parseInt(userCountResult[0].total_users),
      totalJobs: jobCount,
      timestamp: new Date()
    };
  }
}
