import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FileUploadService {
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads/temp';
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {

    }
  }

  async storeFile(file: Express.Multer.File): Promise<string> {
    const startTime = Date.now();



    
    const fileId = crypto.randomUUID();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);




    try {

      const writeStartTime = Date.now();
      await fs.writeFile(filePath, file.buffer);
      const writeTime = Date.now() - writeStartTime;
      
      const totalTime = Date.now() - startTime;



      
      return filePath;
    } catch (error) {
      const totalTime = Date.now() - startTime;

      throw new Error('Failed to store file');
    }
  }

  async cleanupFile(filePath: string): Promise<void> {
    const startTime = Date.now();


    
    try {
      await fs.unlink(filePath);
      const totalTime = Date.now() - startTime;

    } catch (error) {
      const totalTime = Date.now() - startTime;

    }
  }

  async getFileStats(filePath: string): Promise<{ size: number; created: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
      };
    } catch (error) {
      throw new Error('Failed to get file stats');
    }
  }
}
