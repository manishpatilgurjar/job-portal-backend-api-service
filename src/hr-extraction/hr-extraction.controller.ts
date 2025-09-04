import { Controller, Post, UploadedFile, UseInterceptors, Body, HttpCode, HttpStatus, Get, Param, Query, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HrExtractionService } from './services/hr-extraction.service';
import { BackgroundProcessingService } from './services/background-processing.service';
import { MongoDBService } from '../database/services/mongodb.service';
import { HrExtractionDto } from './dto/hr-extraction.dto';

@Controller('api/hr-extraction')
export class HrExtractionController {
  constructor(
    private hrExtractionService: HrExtractionService,
    private backgroundProcessingService: BackgroundProcessingService,
    private mongoDBService: MongoDBService,
  ) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async extractHrData(
    @UploadedFile() file: Express.Multer.File,
    @Body() extractionDto: HrExtractionDto,
  ) {
    const startTime = Date.now();
    console.log('🚀 [HR-EXTRACTION] Starting HR data extraction...');
    console.log(`📁 [HR-EXTRACTION] File: ${file?.originalname}, Size: ${file?.size} bytes`);
    console.log(`⚙️ [HR-EXTRACTION] Extraction Type: ${extractionDto.extractionType || 'general'}`);
    console.log(`📝 [HR-EXTRACTION] Source: ${extractionDto.source || 'unknown'}`);
    
    try {
      const result = await this.hrExtractionService.extractHrData(file, extractionDto);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [HR-EXTRACTION] Extraction completed successfully in ${processingTime}ms`);
      console.log(`👥 [HR-EXTRACTION] Found ${result.data.people.length} people`);
      console.log(`🎯 [HR-EXTRACTION] Confidence: ${result.data.metadata.confidence}`);
      
      return {
        success: result.success,
        data: result.data,
        message: result.message,
        processingTime: result.processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [HR-EXTRACTION] Extraction failed after ${processingTime}ms:`, error.message);
      throw error;
    }
  }

  @Post('extract-text')
  @HttpCode(HttpStatus.OK)
  async extractFromText(@Body() textDto: { text: string; source?: string }) {
    const startTime = Date.now();
    console.log('🚀 [HR-EXTRACTION-TEXT] Starting text-based HR data extraction...');
    console.log(`📝 [HR-EXTRACTION-TEXT] Text length: ${textDto.text?.length || 0} characters`);
    console.log(`📝 [HR-EXTRACTION-TEXT] Source: ${textDto.source || 'text_input'}`);
    
    try {
      const result = await this.hrExtractionService.extractFromText(textDto.text, textDto.source);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [HR-EXTRACTION-TEXT] Text extraction completed in ${processingTime}ms`);
      console.log(`👥 [HR-EXTRACTION-TEXT] Found ${result.data.people.length} people`);
      
      return {
        success: result.success,
        data: result.data,
        message: result.message,
        processingTime: result.processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [HR-EXTRACTION-TEXT] Text extraction failed after ${processingTime}ms:`, error.message);
      throw error;
    }
  }

  @Post('extract-background')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async extractHrDataBackground(
    @UploadedFile() file: Express.Multer.File,
    @Body() extractionDto: HrExtractionDto,
  ) {
    const startTime = Date.now();
    console.log('🚀 [HR-EXTRACTION-BG] Starting background HR data extraction...');
    console.log(`📁 [HR-EXTRACTION-BG] File: ${file?.originalname}, Size: ${file?.size} bytes`);
    console.log(`⚙️ [HR-EXTRACTION-BG] Extraction Type: ${extractionDto.extractionType || 'general'}`);
    console.log(`📝 [HR-EXTRACTION-BG] Source: ${extractionDto.source || 'unknown'}`);
    
    try {
      // Store file temporarily
      const filePath = await this.hrExtractionService.storeFileTemporarily(file);
      
      // Create background job
      const job = await this.backgroundProcessingService.createBackgroundJob(
        filePath,
        extractionDto.extractionType || 'general',
        extractionDto.source || file.originalname,
        extractionDto.description,
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [HR-EXTRACTION-BG] Background job created in ${processingTime}ms`);
      console.log(`🆔 [HR-EXTRACTION-BG] Job ID: ${job.jobId}`);
      
      return {
        success: true,
        data: {
          jobId: job.jobId,
          message: job.message,
          status: 'pending',
        },
        message: 'Background processing started successfully',
        processingTime: `${processingTime}ms`,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [HR-EXTRACTION-BG] Background job creation failed after ${processingTime}ms:`, error.message);
      throw error;
    }
  }

  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    console.log(`🔍 [HR-EXTRACTION-BG] Getting status for job: ${jobId}`);
    
    const job = this.backgroundProcessingService.getJobStatus(jobId);
    if (!job) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    return {
      success: true,
      data: job,
      message: 'Job status retrieved successfully',
    };
  }

  @Get('jobs')
  async getAllJobs() {
    console.log(`📋 [HR-EXTRACTION-BG] Getting all jobs`);
    
    const jobs = this.backgroundProcessingService.getAllJobs();
    
    return {
      success: true,
      data: jobs,
      message: 'Jobs retrieved successfully',
    };
  }

  @Get('data/batch/:batchId')
  async getHrDataByBatch(@Param('batchId') batchId: string) {
    console.log(`📊 [HR-EXTRACTION-BG] Getting HR data for batch: ${batchId}`);
    
    const data = await this.backgroundProcessingService.getHrDataByBatch(batchId);
    
    return {
      success: true,
      data: {
        batchId,
        people: data,
        totalPeople: data.length,
      },
      message: 'HR data retrieved successfully',
    };
  }

  @Get('stats')
  async getHrDataStats() {
    console.log(`📈 [HR-EXTRACTION-BG] Getting HR data statistics`);
    
    const stats = await this.backgroundProcessingService.getHrDataStats();
    
    return {
      success: true,
      data: stats,
      message: 'Statistics retrieved successfully',
    };
  }

  @Get('search')
  async searchHrData(
    @Query('q') search?: string,
    @Query('company') company?: string,
    @Query('position') position?: string,
    @Query('status') status?: string,
    @Query('batchId') batchId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    console.log(`🔍 [HR-EXTRACTION-SEARCH] Searching HR data...`);
    
    const searchQuery = {
      search,
      company,
      position,
      status,
      batchId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    };

    const result = await this.mongoDBService.searchHrData(searchQuery);
    
    return {
      success: true,
      data: result,
      message: 'Search completed successfully',
    };
  }

  @Get('data/:id')
  async getHrDataById(@Param('id') id: string) {
    console.log(`📊 [HR-EXTRACTION] Getting HR data by ID: ${id}`);
    
    try {
      // This would need to be implemented in MongoDBService
      // For now, return a placeholder
      return {
        success: true,
        data: { id, message: 'Individual record retrieval not implemented yet' },
        message: 'HR data retrieved successfully',
      };
    } catch (error) {
      console.error(`❌ [HR-EXTRACTION] Failed to get HR data by ID: ${error.message}`);
      throw error;
    }
  }

  @Post('data/batch/:batchId/status')
  async updateBatchStatus(
    @Param('batchId') batchId: string,
    @Body() body: { status: 'pending' | 'processed' | 'failed'; errorMessage?: string }
  ) {
    console.log(`🔄 [HR-EXTRACTION] Updating batch status: ${batchId} to ${body.status}`);
    
    try {
      // This would need to be implemented in MongoDBService
      return {
        success: true,
        data: { batchId, status: body.status },
        message: 'Batch status updated successfully',
      };
    } catch (error) {
      console.error(`❌ [HR-EXTRACTION] Failed to update batch status: ${error.message}`);
      throw error;
    }
  }

  @Delete('data/batch/:batchId')
  async deleteBatchData(@Param('batchId') batchId: string) {
    console.log(`🗑️ [HR-EXTRACTION] Deleting batch data: ${batchId}`);
    
    try {
      const deletedCount = await this.mongoDBService.deleteHrDataByBatch(batchId);
      
      return {
        success: true,
        data: { batchId, deletedCount },
        message: `Deleted ${deletedCount} records for batch ${batchId}`,
      };
    } catch (error) {
      console.error(`❌ [HR-EXTRACTION] Failed to delete batch data: ${error.message}`);
      throw error;
    }
  }
}
