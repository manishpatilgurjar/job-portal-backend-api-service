import { Injectable, Logger } from '@nestjs/common';
import { GrokService } from './grok.service';
import { MongoDBService } from '../../database/services/mongodb.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface BackgroundJob {
  id: string;
  filePath: string;
  extractionType: string;
  source: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalChunks: number;
  processedChunks: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

@Injectable()
export class BackgroundProcessingService {
  private readonly logger = new Logger(BackgroundProcessingService.name);
  private jobs: Map<string, BackgroundJob> = new Map();
  private isProcessing = false;

  constructor(
    private grokService: GrokService,
    private mongoDBService: MongoDBService,
  ) {
    // Start background processing loop
    this.startProcessingLoop();
  }

  async createBackgroundJob(
    filePath: string,
    extractionType: string,
    source: string,
    description?: string,
  ): Promise<{ jobId: string; message: string }> {
    const jobId = crypto.randomUUID();
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const chunkSize = 50000; // 50k characters per chunk
    const totalChunks = Math.ceil(fileContent.length / chunkSize);

    const job: BackgroundJob = {
      id: jobId,
      filePath,
      extractionType,
      source,
      description,
      status: 'pending',
      totalChunks,
      processedChunks: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);



    return {
      jobId,
      message: `Background processing started. Job ID: ${jobId}. Processing ${totalChunks} chunks every 2 minutes.`,
    };
  }

  private async startProcessingLoop() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;


    setInterval(async () => {
      await this.processNextJob();
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  private async processNextJob() {
    const pendingJobs = Array.from(this.jobs.values()).filter(
      job => job.status === 'pending' || job.status === 'processing'
    );

    if (pendingJobs.length === 0) return;

    const job = pendingJobs[0];


    try {
      job.status = 'processing';
      if (!job.startedAt) {
        job.startedAt = new Date();
      }

      await this.processJobChunk(job);
      
      if (job.processedChunks >= job.totalChunks) {
        job.status = 'completed';
        job.completedAt = new Date();

      }
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error.message;
      job.completedAt = new Date();

    }
  }

  private async processJobChunk(job: BackgroundJob) {
    const fileContent = await fs.readFile(job.filePath, 'utf-8');
    const chunkSize = 50000;
    const startIndex = job.processedChunks * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, fileContent.length);
    const chunk = fileContent.substring(startIndex, endIndex);



    // Save chunk to temporary file
    const chunkPath = path.join('uploads', 'chunks', `${job.id}_chunk_${job.processedChunks}.txt`);
    await fs.mkdir(path.dirname(chunkPath), { recursive: true });
    await fs.writeFile(chunkPath, chunk, 'utf-8');

    try {
      // Process chunk with Grok AI
      const result = await this.grokService.analyzeHrData(chunk, {
        extractionType: job.extractionType,
        source: job.source,
        description: job.description,
      });

      // Save HR data to MongoDB
      if (result.people && result.people.length > 0) {
        const hrDataToSave = result.people.map(person => ({
          ...person,
          source: job.source,
          extractionType: job.extractionType,
          description: job.description,
          confidence: result.confidence || 0.8,
          status: 'processed' as const,
          batchId: job.id,
          chunkIndex: job.processedChunks,
          totalChunks: job.totalChunks,
          processingStartedAt: new Date(),
          processingCompletedAt: new Date(),
        }));

        await this.mongoDBService.saveHrData(hrDataToSave);

      }

      // Clean up chunk file
      await fs.unlink(chunkPath);

      job.processedChunks++;


    } catch (error) {

      
      // Clean up chunk file on error
      try {
        await fs.unlink(chunkPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    }
  }

  getJobStatus(jobId: string): BackgroundJob | null {
    return this.jobs.get(jobId) || null;
  }

  getAllJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values());
  }

  async getHrDataByBatch(batchId: string) {
    return this.mongoDBService.getHrDataByBatch(batchId);
  }

  async getHrDataStats() {
    return this.mongoDBService.getHrDataStats();
  }
}
