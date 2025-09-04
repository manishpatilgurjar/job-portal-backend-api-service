import { Injectable, BadRequestException } from '@nestjs/common';
import { TextractService } from './textract.service';
import { PdfParserService } from './pdf-parser.service';
import { CsvParserService } from './csv-parser.service';
import { ExcelParserService } from './excel-parser.service';
import { HrExtractionDto, ExtractionResult, HrPersonData } from '../dto/hr-extraction.dto';
import { GrokAnalysisRequest } from '../interfaces/grok.interface';
import * as path from 'path';
import { FileUploadService } from './file-upload.service';
import { GrokService } from './grok.service';
import { MongoDBService } from '../../database/services/mongodb.service';
import * as crypto from 'crypto';
import { winstonConfig } from '../../common/logger/winston.config';

@Injectable()
export class HrExtractionService {
  constructor(
    private fileUploadService: FileUploadService,
    private textractService: TextractService,
    private grokService: GrokService,
    private pdfParserService: PdfParserService,
    private csvParserService: CsvParserService,
    private excelParserService: ExcelParserService,
    private mongoDBService: MongoDBService,
  ) {}

  async extractHrData(file: Express.Multer.File, extractionDto: HrExtractionDto): Promise<ExtractionResult> {
    const overallStartTime = Date.now();
    winstonConfig.log('🔄 [HR-SERVICE] Starting HR data extraction process...', 'HrExtractionService');
    
    if (!file) {
      winstonConfig.error('❌ [HR-SERVICE] No file provided', 'HrExtractionService');
      throw new BadRequestException('No file provided');
    }

    winstonConfig.log(`📁 [HR-SERVICE] File details: ${file.originalname} (${file.size} bytes)`, 'HrExtractionService');
    const fileExtension = path.extname(file.originalname).toLowerCase();
    winstonConfig.log(`🔍 [HR-SERVICE] Detected file type: ${fileExtension}`, 'HrExtractionService');

    // Store file temporarily
    winstonConfig.log('💾 [HR-SERVICE] Storing file temporarily...', 'HrExtractionService');
    const fileStorageStartTime = Date.now();
    const filePath = await this.fileUploadService.storeFile(file);
    const fileStorageTime = Date.now() - fileStorageStartTime;
    winstonConfig.log(`✅ [HR-SERVICE] File stored in ${fileStorageTime}ms: ${filePath}`, 'HrExtractionService');

    try {
      let extractedText: string;
      let rawData: any;
      let processingTime: number;

      // Process based on file type
      switch (fileExtension) {
        case '.pdf':
          winstonConfig.log('📄 [HR-SERVICE] Processing PDF file...', 'HrExtractionService');
          const pdfStartTime = Date.now();
          rawData = await this.pdfParserService.parsePdf(filePath);
          extractedText = rawData.text;
          processingTime = Date.now() - pdfStartTime;
          winstonConfig.log(`✅ [HR-SERVICE] PDF processed in ${processingTime}ms - ${rawData.pages} pages, ${extractedText.length} characters`, 'HrExtractionService');
          break;

        case '.csv':
          winstonConfig.log('📊 [HR-SERVICE] Processing CSV file...', 'HrExtractionService');
          const csvStartTime = Date.now();
          rawData = await this.csvParserService.parseCsv(filePath);
          extractedText = rawData.text;
          processingTime = Date.now() - csvStartTime;
          winstonConfig.log(`✅ [HR-SERVICE] CSV processed in ${processingTime}ms - ${rawData.rows.length} rows, ${rawData.headers.length} columns`, 'HrExtractionService');
          break;

        case '.xlsx':
        case '.xls':
          winstonConfig.log('📊 [HR-SERVICE] Processing Excel file...');
          const excelStartTime = Date.now();
          const excelResult = await this.excelParserService.parseExcel(filePath);
          if (!excelResult.success || !excelResult.data) {
            throw new BadRequestException(`Excel parsing failed: ${excelResult.error}`);
          }
          extractedText = excelResult.data;
          processingTime = Date.now() - excelStartTime;
          winstonConfig.log(`✅ [HR-SERVICE] Excel processed in ${processingTime}ms - ${extractedText.length} characters`);
          break;

        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.tiff':
        case '.bmp':
          winstonConfig.log('🖼️ [HR-SERVICE] Processing image file with OCR...');
          const imageStartTime = Date.now();
          extractedText = await this.textractService.extractText(filePath);
          processingTime = Date.now() - imageStartTime;
          winstonConfig.log(`✅ [HR-SERVICE] Image OCR completed in ${processingTime}ms - ${extractedText.length} characters extracted`);
          break;

        default:
          winstonConfig.log('🔍 [HR-SERVICE] Processing unknown file type with OCR...');
          const unknownStartTime = Date.now();
          extractedText = await this.textractService.extractText(filePath);
          processingTime = Date.now() - unknownStartTime;
          winstonConfig.log(`✅ [HR-SERVICE] Unknown file OCR completed in ${processingTime}ms - ${extractedText.length} characters extracted`);
      }

      if (!extractedText || extractedText.trim().length === 0) {
        winstonConfig.error('❌ [HR-SERVICE] No text could be extracted from the file');
        throw new BadRequestException('No text could be extracted from the file');
      }

      winstonConfig.log(`📝 [HR-SERVICE] Extracted text preview: ${extractedText.substring(0, 200)}...`);

      // Generate batch ID for this extraction (based on file content hash to avoid reprocessing)
      const fileContentHash = crypto.createHash('md5').update(extractedText).digest('hex');
      const batchId = `${fileContentHash.substring(0, 8)}-${crypto.randomUUID().substring(0, 8)}`;
      winstonConfig.log(`🆔 [HR-SERVICE] Generated batch ID: ${batchId}`);

      // Check if this file has already been processed
      const batchExists = await this.mongoDBService.checkBatchExists(batchId);
      if (batchExists) {
        winstonConfig.log(`⚠️ [HR-SERVICE] Batch ${batchId} already exists, returning existing data...`);
        const existingData = await this.mongoDBService.getHrDataByBatch(batchId);
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
            }
          },
          message: 'HR data extracted successfully (from existing data)',
          processingTime: `${Date.now() - overallStartTime}ms`
        };
      }

      // Send to Grok AI for analysis with immediate database saving
      winstonConfig.log('🤖 [HR-SERVICE] Sending to Grok AI for analysis...');
      const aiStartTime = Date.now();
      const aiResult = await this.grokService.analyzeHrData(extractedText, {
        extractionType: extractionDto.extractionType || 'general',
        source: extractionDto.source || file.originalname,
        description: extractionDto.description,
        batchId: batchId,
      }, async (chunkData) => {
        // Callback to save data immediately as each chunk is processed
        winstonConfig.log(`💾 [HR-SERVICE] Saving chunk data to MongoDB immediately...`);
        const hrDataToSave = chunkData.people.map((person: any) => ({
          ...person,
          source: chunkData.source,
          extractionType: chunkData.extractionType,
          description: chunkData.description,
          confidence: chunkData.confidence,
          status: 'processed' as const,
          batchId: chunkData.batchId,
          chunkIndex: chunkData.chunkIndex,
          totalChunks: chunkData.totalChunks,
          processingStartedAt: new Date(),
          processingCompletedAt: new Date(),
          originalFileName: file.originalname,
          fileSize: file.size,
        }));

        await this.mongoDBService.saveHrData(hrDataToSave);
        winstonConfig.log(`✅ [HR-SERVICE] Saved ${hrDataToSave.length} HR records to MongoDB`);
      });
      const aiProcessingTime = Date.now() - aiStartTime;
      winstonConfig.log(`✅ [HR-SERVICE] Grok AI analysis completed in ${aiProcessingTime}ms`);
      winstonConfig.log(`👥 [HR-SERVICE] AI found ${aiResult.people.length} people with confidence ${aiResult.confidence}`);

      const totalProcessingTime = Date.now() - overallStartTime;
      winstonConfig.log(`🎉 [HR-SERVICE] Total processing time: ${totalProcessingTime}ms`);

      return {
        success: true,
        data: {
          people: aiResult.people,
          metadata: {
            totalPeople: aiResult.people.length,
            extractionType: extractionDto.extractionType || 'general',
            source: extractionDto.source || file.originalname,
            processedAt: new Date().toISOString(),
            confidence: aiResult.confidence || 0.8,
            batchId: batchId,
          },
        },
        message: 'HR data extracted successfully',
        processingTime: `${Date.now() - overallStartTime}ms`,
        rawData: rawData,
      };

    } finally {
      // Clean up temporary file
      winstonConfig.log('🗑️ [HR-SERVICE] Cleaning up temporary file...');
      const cleanupStartTime = Date.now();
      await this.fileUploadService.cleanupFile(filePath);
      const cleanupTime = Date.now() - cleanupStartTime;
      winstonConfig.log(`✅ [HR-SERVICE] File cleanup completed in ${cleanupTime}ms`);
    }
  }

  async extractFromText(text: string, source?: string): Promise<ExtractionResult> {
    const overallStartTime = Date.now();
    winstonConfig.log('🔄 [HR-SERVICE-TEXT] Starting text-based HR data extraction...');
    
    if (!text || text.trim().length === 0) {
      winstonConfig.error('❌ [HR-SERVICE-TEXT] No text provided');
      throw new BadRequestException('No text provided');
    }

    winstonConfig.log(`📝 [HR-SERVICE-TEXT] Text length: ${text.length} characters`);
    winstonConfig.log(`📝 [HR-SERVICE-TEXT] Text preview: ${text.substring(0, 200)}...`);

    // Generate batch ID for this extraction (based on text content hash to avoid reprocessing)
    const textContentHash = crypto.createHash('md5').update(text).digest('hex');
    const batchId = `text-${textContentHash.substring(0, 8)}-${crypto.randomUUID().substring(0, 8)}`;
    winstonConfig.log(`🆔 [HR-SERVICE-TEXT] Generated batch ID: ${batchId}`);

    // Check if this text has already been processed
    const batchExists = await this.mongoDBService.checkBatchExists(batchId);
    if (batchExists) {
      winstonConfig.log(`⚠️ [HR-SERVICE-TEXT] Batch ${batchId} already exists, returning existing data...`);
      const existingData = await this.mongoDBService.getHrDataByBatch(batchId);
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
          }
        },
        message: 'HR data extracted successfully (from existing data)',
        processingTime: `${Date.now() - overallStartTime}ms`
      };
    }

    winstonConfig.log('🤖 [HR-SERVICE-TEXT] Sending to Grok AI for analysis...');
    const aiStartTime = Date.now();
    const aiResult = await this.grokService.analyzeHrData(text, {
      extractionType: 'general',
      source: source || 'text_input',
      description: 'Text input analysis',
      batchId: batchId,
    }, async (chunkData) => {
      // Callback to save data immediately as each chunk is processed
      winstonConfig.log(`💾 [HR-SERVICE-TEXT] Saving chunk data to MongoDB immediately...`);
      const hrDataToSave = chunkData.people.map((person: any) => ({
        ...person,
        source: chunkData.source,
        extractionType: chunkData.extractionType,
        description: chunkData.description,
        confidence: chunkData.confidence,
        status: 'processed' as const,
        batchId: chunkData.batchId,
        chunkIndex: chunkData.chunkIndex,
        totalChunks: chunkData.totalChunks,
        processingStartedAt: new Date(),
        processingCompletedAt: new Date(),
      }));

      await this.mongoDBService.saveHrData(hrDataToSave);
      winstonConfig.log(`✅ [HR-SERVICE-TEXT] Saved ${hrDataToSave.length} HR records to MongoDB`);
    });
    const aiProcessingTime = Date.now() - aiStartTime;
    
    winstonConfig.log(`✅ [HR-SERVICE-TEXT] Grok AI analysis completed in ${aiProcessingTime}ms`);
    winstonConfig.log(`👥 [HR-SERVICE-TEXT] AI found ${aiResult.people.length} people with confidence ${aiResult.confidence}`);

    const totalProcessingTime = Date.now() - overallStartTime;
    winstonConfig.log(`🎉 [HR-SERVICE-TEXT] Total processing time: ${totalProcessingTime}ms`);

    return {
      success: true,
      data: {
        people: aiResult.people,
        metadata: {
          totalPeople: aiResult.people.length,
          extractionType: 'general',
          source: source || 'text_input',
          processedAt: new Date().toISOString(),
          confidence: aiResult.confidence || 0.8,
          batchId: batchId,
        },
      },
      message: 'HR data extracted successfully',
      processingTime: `${Date.now() - overallStartTime}ms`,
    };
  }

  async storeFileTemporarily(file: Express.Multer.File): Promise<string> {
    return this.fileUploadService.storeFile(file);
  }
}
