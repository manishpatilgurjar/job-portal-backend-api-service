import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HrExtractionService } from './hr-extraction.service';
import { UserHrDataService } from '../../database/services/user-hr-data.service';
import { HrExtractionDto } from '../dto/hr-extraction.dto';
import { ExtractionResult } from '../dto/hr-extraction.dto';
import { GrokAnalysisRequest } from '../interfaces/grok.interface';
import * as crypto from 'crypto';

export interface UserExtractionResult extends ExtractionResult {
  userId: number;
  userEmail: string;
  duplicatesInMaster: number;
  uniqueToUser: number;
}

@Injectable()
export class UserHrExtractionService {
  private readonly logger = new Logger(UserHrExtractionService.name);

  constructor(
    private hrExtractionService: HrExtractionService,
    private userHrDataService: UserHrDataService
  ) {}

  async extractUserHrData(
    userId: number,
    userEmail: string,
    file: Express.Multer.File,
    extractionDto: HrExtractionDto
  ): Promise<UserExtractionResult> {
    const overallStartTime = Date.now();
    this.logger.log(`🔄 [USER-HR-SERVICE] Starting user-specific HR data extraction for user ${userId}...`);

    if (!file) {
      this.logger.error('❌ [USER-HR-SERVICE] No file provided');
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`📁 [USER-HR-SERVICE] File details: ${file.originalname} (${file.size} bytes) for user ${userId}`);

    // Generate content-based batch ID to avoid reprocessing
    const fileContentHash = crypto.createHash('md5').update(file.buffer).digest('hex');
    const batchId = `user-${userId}-${fileContentHash.substring(0, 8)}-${crypto.randomUUID().substring(0, 8)}`;
    this.logger.log(`🆔 [USER-HR-SERVICE] Generated batch ID: ${batchId}`);

    // Check if this file has already been processed by this user
    const batchExists = await this.userHrDataService.checkUserBatchExists(userId, batchId);
    if (batchExists) {
      this.logger.log(`⚠️ [USER-HR-SERVICE] Batch ${batchId} already exists for user ${userId}, returning existing data...`);
      const existingData = await this.userHrDataService.getUserHrDataByBatch(userId, batchId);
      return {
        success: true,
        data: {
          people: existingData.map(record => ({
            name: record.name || '',
            email: record.email || '',
            position: record.position || '',
            company: record.company || '',
            phone: record.phone,
            location: record.location,
            department: record.department,
            linkedin: record.linkedin,
            website: record.website,
            additionalInfo: record.additionalInfo,
          })),
          metadata: {
            totalPeople: existingData.length,
            extractionType: extractionDto.extractionType || 'general',
            source: file.originalname,
            processedAt: new Date().toISOString(),
            confidence: existingData.length > 0 ? existingData[0].confidence : 0.5,
            batchId: batchId,
          },
        },
        message: 'HR data extracted successfully (from existing data)',
        processingTime: `${Date.now() - overallStartTime}ms`,
        userId,
        userEmail,
        duplicatesInMaster: existingData.filter(r => r.isDuplicateInMaster).length,
        uniqueToUser: existingData.filter(r => !r.isDuplicateInMaster).length,
      };
    }

    // Use the existing HR extraction service to process the file
    this.logger.log('🤖 [USER-HR-SERVICE] Processing file with existing HR extraction service...');
    const extractionResult = await this.hrExtractionService.extractHrData(file, extractionDto);

    if (!extractionResult.success || !extractionResult.data.people.length) {
      this.logger.warn(`⚠️ [USER-HR-SERVICE] No people found in extraction result for user ${userId}`);
      return {
        success: true,
        data: {
          people: [],
          metadata: {
            totalPeople: 0,
            extractionType: extractionDto.extractionType || 'general',
            source: file.originalname,
            processedAt: new Date().toISOString(),
            confidence: 0.1,
            batchId: batchId,
          },
        },
        message: 'No HR data found in the uploaded file',
        processingTime: `${Date.now() - overallStartTime}ms`,
        userId,
        userEmail,
        duplicatesInMaster: 0,
        uniqueToUser: 0,
      };
    }

    // Save to user-specific collection with cross-reference checking
    this.logger.log(`💾 [USER-HR-SERVICE] Saving ${extractionResult.data.people.length} records to user collection...`);
    const userHrDataToSave = extractionResult.data.people.map((person: any) => ({
      name: person.name,
      email: person.email,
      position: person.position,
      company: person.company,
      phone: person.phone,
      location: person.location,
      department: person.department,
      linkedin: person.linkedin,
      website: person.website,
      additionalInfo: person.additionalInfo,
      source: extractionDto.source || file.originalname,
      extractionType: extractionDto.extractionType || 'general',
      description: extractionDto.description,
      confidence: extractionResult.data.metadata.confidence,
      status: 'processed' as const,
      originalFileName: file.originalname,
      fileSize: file.size,
    }));

    const savedRecords = await this.userHrDataService.saveUserHrData(
      userId,
      userEmail,
      userHrDataToSave,
      batchId
    );

    const duplicatesInMaster = savedRecords.filter(r => r.isDuplicateInMaster).length;
    const uniqueToUser = savedRecords.filter(r => !r.isDuplicateInMaster).length;

    this.logger.log(`✅ [USER-HR-SERVICE] User extraction completed for user ${userId}`);
    this.logger.log(`📊 [USER-HR-SERVICE] Saved ${savedRecords.length} records (${duplicatesInMaster} duplicates in master, ${uniqueToUser} unique to user)`);

    return {
      success: true,
      data: {
        people: savedRecords.map(record => ({
          name: record.name || '',
          email: record.email || '',
          position: record.position || '',
          company: record.company || '',
          phone: record.phone,
          location: record.location,
          department: record.department,
          linkedin: record.linkedin,
          website: record.website,
          additionalInfo: record.additionalInfo,
        })),
        metadata: {
          totalPeople: savedRecords.length,
          extractionType: extractionDto.extractionType || 'general',
          source: file.originalname,
          processedAt: new Date().toISOString(),
          confidence: extractionResult.data.metadata.confidence,
          batchId: batchId,
        },
      },
      message: `HR data extracted successfully. ${duplicatesInMaster} records already exist in master data, ${uniqueToUser} are unique to you.`,
      processingTime: `${Date.now() - overallStartTime}ms`,
      userId,
      userEmail,
      duplicatesInMaster,
      uniqueToUser,
    };
  }

  async extractUserHrDataFromText(
    userId: number,
    userEmail: string,
    text: string,
    source?: string
  ): Promise<UserExtractionResult> {
    const overallStartTime = Date.now();
    this.logger.log(`🔄 [USER-HR-SERVICE-TEXT] Starting user-specific text extraction for user ${userId}...`);

    if (!text || text.trim().length === 0) {
      this.logger.error('❌ [USER-HR-SERVICE-TEXT] No text provided');
      throw new BadRequestException('No text provided');
    }

    this.logger.log(`📝 [USER-HR-SERVICE-TEXT] Text length: ${text.length} characters for user ${userId}`);

    // Generate content-based batch ID
    const textContentHash = crypto.createHash('md5').update(text).digest('hex');
    const batchId = `user-text-${userId}-${textContentHash.substring(0, 8)}-${crypto.randomUUID().substring(0, 8)}`;
    this.logger.log(`🆔 [USER-HR-SERVICE-TEXT] Generated batch ID: ${batchId}`);

    // Check if this text has already been processed by this user
    const batchExists = await this.userHrDataService.checkUserBatchExists(userId, batchId);
    if (batchExists) {
      this.logger.log(`⚠️ [USER-HR-SERVICE-TEXT] Batch ${batchId} already exists for user ${userId}, returning existing data...`);
      const existingData = await this.userHrDataService.getUserHrDataByBatch(userId, batchId);
      return {
        success: true,
        data: {
          people: existingData.map(record => ({
            name: record.name || '',
            email: record.email || '',
            position: record.position || '',
            company: record.company || '',
            phone: record.phone,
            location: record.location,
            department: record.department,
            linkedin: record.linkedin,
            website: record.website,
            additionalInfo: record.additionalInfo,
          })),
          metadata: {
            totalPeople: existingData.length,
            extractionType: 'general',
            source: source || 'text_input',
            processedAt: new Date().toISOString(),
            confidence: existingData.length > 0 ? existingData[0].confidence : 0.5,
            batchId: batchId,
          },
        },
        message: 'HR data extracted successfully (from existing data)',
        processingTime: `${Date.now() - overallStartTime}ms`,
        userId,
        userEmail,
        duplicatesInMaster: existingData.filter(r => r.isDuplicateInMaster).length,
        uniqueToUser: existingData.filter(r => !r.isDuplicateInMaster).length,
      };
    }

    // Use the existing HR extraction service to process the text
    this.logger.log('🤖 [USER-HR-SERVICE-TEXT] Processing text with existing HR extraction service...');
    const extractionResult = await this.hrExtractionService.extractFromText(text, source);

    if (!extractionResult.success || !extractionResult.data.people.length) {
      this.logger.warn(`⚠️ [USER-HR-SERVICE-TEXT] No people found in extraction result for user ${userId}`);
      return {
        success: true,
        data: {
          people: [],
          metadata: {
            totalPeople: 0,
            extractionType: 'general',
            source: source || 'text_input',
            processedAt: new Date().toISOString(),
            confidence: 0.1,
            batchId: batchId,
          },
        },
        message: 'No HR data found in the provided text',
        processingTime: `${Date.now() - overallStartTime}ms`,
        userId,
        userEmail,
        duplicatesInMaster: 0,
        uniqueToUser: 0,
      };
    }

    // Save to user-specific collection with cross-reference checking
    this.logger.log(`💾 [USER-HR-SERVICE-TEXT] Saving ${extractionResult.data.people.length} records to user collection...`);
    const userHrDataToSave = extractionResult.data.people.map((person: any) => ({
      name: person.name,
      email: person.email,
      position: person.position,
      company: person.company,
      phone: person.phone,
      location: person.location,
      department: person.department,
      linkedin: person.linkedin,
      website: person.website,
      additionalInfo: person.additionalInfo,
      source: source || 'text_input',
      extractionType: 'general',
      description: 'Text input analysis',
      confidence: extractionResult.data.metadata.confidence,
      status: 'processed' as const,
    }));

    const savedRecords = await this.userHrDataService.saveUserHrData(
      userId,
      userEmail,
      userHrDataToSave,
      batchId
    );

    const duplicatesInMaster = savedRecords.filter(r => r.isDuplicateInMaster).length;
    const uniqueToUser = savedRecords.filter(r => !r.isDuplicateInMaster).length;

    this.logger.log(`✅ [USER-HR-SERVICE-TEXT] User text extraction completed for user ${userId}`);
    this.logger.log(`📊 [USER-HR-SERVICE-TEXT] Saved ${savedRecords.length} records (${duplicatesInMaster} duplicates in master, ${uniqueToUser} unique to user)`);

    return {
      success: true,
      data: {
        people: savedRecords.map(record => ({
          name: record.name || '',
          email: record.email || '',
          position: record.position || '',
          company: record.company || '',
          phone: record.phone,
          location: record.location,
          department: record.department,
          linkedin: record.linkedin,
          website: record.website,
          additionalInfo: record.additionalInfo,
        })),
        metadata: {
          totalPeople: savedRecords.length,
          extractionType: 'general',
          source: source || 'text_input',
          processedAt: new Date().toISOString(),
          confidence: extractionResult.data.metadata.confidence,
          batchId: batchId,
        },
      },
      message: `HR data extracted successfully. ${duplicatesInMaster} records already exist in master data, ${uniqueToUser} are unique to you.`,
      processingTime: `${Date.now() - overallStartTime}ms`,
      userId,
      userEmail,
      duplicatesInMaster,
      uniqueToUser,
    };
  }
}
