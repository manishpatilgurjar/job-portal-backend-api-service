import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  Query,
  Param,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserHrExtractionService } from '../services/user-hr-extraction.service';
import { UserHrDataService } from '../../database/services/user-hr-data.service';
import { HrExtractionDto } from '../dto/hr-extraction.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

@Controller('api/user/hr-extraction')
@UseGuards(JwtAuthGuard)
export class UserHrExtractionController {
  private readonly logger = new Logger(UserHrExtractionController.name);

  constructor(
    private userHrExtractionService: UserHrExtractionService,
    private userHrDataService: UserHrDataService
  ) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractHrData(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() extractionDto: HrExtractionDto
  ) {
    const startTime = Date.now();
    this.logger.log(`🚀 [USER-HR-EXTRACTION] Starting user-specific HR data extraction...`);
    this.logger.log(`👤 [USER-HR-EXTRACTION] User: ${req.user.email} (ID: ${req.user.id})`);
    
    if (!file) {
      this.logger.error('❌ [USER-HR-EXTRACTION] No file provided');
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`📁 [USER-HR-EXTRACTION] File: ${file.originalname}, Size: ${file.size} bytes`);
    this.logger.log(`⚙️ [USER-HR-EXTRACTION] Extraction Type: ${extractionDto.extractionType || 'general'}`);
    this.logger.log(`📝 [USER-HR-EXTRACTION] Source: ${extractionDto.source || 'unknown'}`);
    
    try {
      const result = await this.userHrExtractionService.extractUserHrData(
        req.user.id,
        req.user.email,
        file,
        extractionDto
      );
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [USER-HR-EXTRACTION] Extraction completed successfully in ${processingTime}ms`);
      this.logger.log(`👥 [USER-HR-EXTRACTION] Found ${result.data.people.length} people`);
      this.logger.log(`🎯 [USER-HR-EXTRACTION] Confidence: ${result.data.metadata.confidence}`);
      this.logger.log(`📊 [USER-HR-EXTRACTION] Duplicates in master: ${result.duplicatesInMaster}, Unique to user: ${result.uniqueToUser}`);
      
      return {
        success: result.success,
        data: result.data,
        message: result.message,
        processingTime: result.processingTime,
        userInfo: {
          userId: result.userId,
          userEmail: result.userEmail,
        },
        statistics: {
          duplicatesInMaster: result.duplicatesInMaster,
          uniqueToUser: result.uniqueToUser,
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [USER-HR-EXTRACTION] Extraction failed after ${processingTime}ms:`, error.message);
      throw error;
    }
  }

  @Post('extract-text')
  async extractFromText(
    @Request() req: AuthenticatedRequest,
    @Body() textDto: { text: string; source?: string }
  ) {
    const startTime = Date.now();
    this.logger.log(`🚀 [USER-HR-EXTRACTION-TEXT] Starting user-specific text extraction...`);
    this.logger.log(`👤 [USER-HR-EXTRACTION-TEXT] User: ${req.user.email} (ID: ${req.user.id})`);
    
    if (!textDto.text || textDto.text.trim().length === 0) {
      this.logger.error('❌ [USER-HR-EXTRACTION-TEXT] No text provided');
      throw new BadRequestException('No text provided');
    }

    this.logger.log(`📝 [USER-HR-EXTRACTION-TEXT] Text length: ${textDto.text?.length || 0} characters`);
    this.logger.log(`📝 [USER-HR-EXTRACTION-TEXT] Source: ${textDto.source || 'text_input'}`);
    
    try {
      const result = await this.userHrExtractionService.extractUserHrDataFromText(
        req.user.id,
        req.user.email,
        textDto.text,
        textDto.source
      );
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [USER-HR-EXTRACTION-TEXT] Text extraction completed in ${processingTime}ms`);
      this.logger.log(`👥 [USER-HR-EXTRACTION-TEXT] Found ${result.data.people.length} people`);
      this.logger.log(`📊 [USER-HR-EXTRACTION-TEXT] Duplicates in master: ${result.duplicatesInMaster}, Unique to user: ${result.uniqueToUser}`);
      
      return {
        success: result.success,
        data: result.data,
        message: result.message,
        processingTime: result.processingTime,
        userInfo: {
          userId: result.userId,
          userEmail: result.userEmail,
        },
        statistics: {
          duplicatesInMaster: result.duplicatesInMaster,
          uniqueToUser: result.uniqueToUser,
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [USER-HR-EXTRACTION-TEXT] Text extraction failed after ${processingTime}ms:`, error.message);
      throw error;
    }
  }

  @Get('data/batch/:batchId')
  async getHrDataByBatch(
    @Request() req: AuthenticatedRequest,
    @Param('batchId') batchId: string
  ) {
    this.logger.log(`📊 [USER-HR-DATA] Retrieving HR data for user ${req.user.id}, batch: ${batchId}`);
    
    try {
      const data = await this.userHrDataService.getUserHrDataByBatch(req.user.id, batchId);
      
      return {
        success: true,
        data: {
          people: data.map(record => ({
            name: record.name,
            email: record.email,
            position: record.position,
            company: record.company,
            phone: record.phone,
            location: record.location,
            department: record.department,
            linkedin: record.linkedin,
            website: record.website,
            additionalInfo: record.additionalInfo,
            isDuplicateInMaster: record.isDuplicateInMaster,
            masterDataId: record.masterDataId,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          })),
          metadata: {
            totalPeople: data.length,
            batchId: batchId,
            userId: req.user.id,
            userEmail: req.user.email,
          }
        },
        message: 'HR data retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-DATA] Failed to retrieve data for batch ${batchId}:`, error.message);
      throw error;
    }
  }

  @Get('stats')
  async getHrDataStats(@Request() req: AuthenticatedRequest) {
    this.logger.log(`📈 [USER-HR-STATS] Calculating statistics for user ${req.user.id}`);
    
    try {
      const stats = await this.userHrDataService.getUserHrDataStats(req.user.id);
      
      return {
        success: true,
        data: {
          ...stats,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        message: 'Statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-STATS] Failed to calculate statistics:`, error.message);
      throw error;
    }
  }

  @Get('search')
  async searchHrData(
    @Request() req: AuthenticatedRequest,
    @Query() query: {
      search?: string;
      company?: string;
      position?: string;
      status?: string;
      batchId?: string;
      isDuplicateInMaster?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    this.logger.log(`🔍 [USER-HR-SEARCH] Searching HR data for user ${req.user.id}`);
    
    try {
      const result = await this.userHrDataService.searchUserHrData(req.user.id, query);
      
      return {
        success: true,
        data: {
          people: result.data.map(record => ({
            name: record.name,
            email: record.email,
            position: record.position,
            company: record.company,
            phone: record.phone,
            location: record.location,
            department: record.department,
            linkedin: record.linkedin,
            website: record.website,
            additionalInfo: record.additionalInfo,
            isDuplicateInMaster: record.isDuplicateInMaster,
            masterDataId: record.masterDataId,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          })),
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
          },
          userId: req.user.id,
          userEmail: req.user.email,
        },
        message: 'Search completed successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-SEARCH] Search failed:`, error.message);
      throw error;
    }
  }

  @Delete('data/batch/:batchId')
  async deleteHrDataByBatch(
    @Request() req: AuthenticatedRequest,
    @Param('batchId') batchId: string
  ) {
    this.logger.log(`🗑️ [USER-HR-DELETE] Deleting HR data for user ${req.user.id}, batch: ${batchId}`);
    
    try {
      const deletedCount = await this.userHrDataService.deleteUserHrDataByBatch(req.user.id, batchId);
      
      return {
        success: true,
        data: {
          deletedCount,
          batchId,
          userId: req.user.id,
        },
        message: `Successfully deleted ${deletedCount} records`,
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-DELETE] Failed to delete data for batch ${batchId}:`, error.message);
      throw error;
    }
  }

  @Get('data')
  async getAllHrData(
    @Request() req: AuthenticatedRequest,
    @Query() query: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    this.logger.log(`📋 [USER-HR-LIST] Retrieving all HR data for user ${req.user.id}`);
    
    try {
      const result = await this.userHrDataService.getAllUserHrData(req.user.id, {
        limit: query.limit ? parseInt(query.limit.toString()) : 50,
        offset: query.offset ? parseInt(query.offset.toString()) : 0,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
      });
      
      return {
        success: true,
        data: {
          people: result.data.map(record => ({
            id: record._id,
            name: record.name,
            email: record.email,
            position: record.position,
            company: record.company,
            phone: record.phone,
            location: record.location,
            department: record.department,
            linkedin: record.linkedin,
            website: record.website,
            additionalInfo: record.additionalInfo,
            isDuplicateInMaster: record.isDuplicateInMaster,
            masterDataId: record.masterDataId,
            userNotes: record.userNotes,
            userTags: record.userTags,
            isPublic: record.isPublic,
            source: record.source,
            extractionType: record.extractionType,
            confidence: record.confidence,
            status: record.status,
            batchId: record.batchId,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastAccessedAt: record.lastAccessedAt,
          })),
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            pages: Math.ceil(result.total / result.limit),
          },
          userId: req.user.id,
          userEmail: req.user.email,
        },
        message: 'HR data retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-LIST] Failed to retrieve HR data:`, error.message);
      throw error;
    }
  }

  @Get('data/:id')
  async getHrDataById(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    this.logger.log(`📊 [USER-HR-VIEW] Retrieving HR data for user ${req.user.id}, ID: ${id}`);
    
    try {
      const data = await this.userHrDataService.getUserHrDataById(req.user.id, id);
      
      if (!data) {
        return {
          success: false,
          message: 'HR data not found or does not belong to you',
          data: null,
        };
      }
      
      return {
        success: true,
        data: {
          id: data._id,
          name: data.name,
          email: data.email,
          position: data.position,
          company: data.company,
          phone: data.phone,
          location: data.location,
          department: data.department,
          linkedin: data.linkedin,
          website: data.website,
          additionalInfo: data.additionalInfo,
          isDuplicateInMaster: data.isDuplicateInMaster,
          masterDataId: data.masterDataId,
          userNotes: data.userNotes,
          userTags: data.userTags,
          isPublic: data.isPublic,
          source: data.source,
          extractionType: data.extractionType,
          confidence: data.confidence,
          status: data.status,
          batchId: data.batchId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastAccessedAt: data.lastAccessedAt,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        message: 'HR data retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-VIEW] Failed to retrieve HR data:`, error.message);
      throw error;
    }
  }

  @Post('data/manual')
  async createManualHrData(
    @Request() req: AuthenticatedRequest,
    @Body() hrData: {
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
    }
  ) {
    this.logger.log(`📝 [USER-HR-MANUAL] Creating manual HR data for user ${req.user.id}`);
    
    try {
      const createdData = await this.userHrDataService.createManualHrData(
        req.user.id,
        req.user.email,
        hrData
      );
      
      return {
        success: true,
        data: {
          id: createdData._id,
          name: createdData.name,
          email: createdData.email,
          position: createdData.position,
          company: createdData.company,
          phone: createdData.phone,
          location: createdData.location,
          department: createdData.department,
          linkedin: createdData.linkedin,
          website: createdData.website,
          additionalInfo: createdData.additionalInfo,
          isDuplicateInMaster: createdData.isDuplicateInMaster,
          masterDataId: createdData.masterDataId,
          userNotes: createdData.userNotes,
          userTags: createdData.userTags,
          isPublic: createdData.isPublic,
          source: createdData.source,
          extractionType: createdData.extractionType,
          confidence: createdData.confidence,
          status: createdData.status,
          batchId: createdData.batchId,
          createdAt: createdData.createdAt,
          updatedAt: createdData.updatedAt,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        message: 'Manual HR data created successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-MANUAL] Failed to create manual HR data:`, error.message);
      throw error;
    }
  }

  @Put('data/:id')
  async updateHrData(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateData: {
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
    }
  ) {
    this.logger.log(`📝 [USER-HR-EDIT] Updating HR data for user ${req.user.id}, ID: ${id}`);
    
    try {
      const updatedData = await this.userHrDataService.updateUserHrData(
        req.user.id,
        id,
        updateData
      );
      
      if (!updatedData) {
        return {
          success: false,
          message: 'HR data not found or does not belong to you',
          data: null,
        };
      }
      
      return {
        success: true,
        data: {
          id: updatedData._id,
          name: updatedData.name,
          email: updatedData.email,
          position: updatedData.position,
          company: updatedData.company,
          phone: updatedData.phone,
          location: updatedData.location,
          department: updatedData.department,
          linkedin: updatedData.linkedin,
          website: updatedData.website,
          additionalInfo: updatedData.additionalInfo,
          isDuplicateInMaster: updatedData.isDuplicateInMaster,
          masterDataId: updatedData.masterDataId,
          userNotes: updatedData.userNotes,
          userTags: updatedData.userTags,
          isPublic: updatedData.isPublic,
          source: updatedData.source,
          extractionType: updatedData.extractionType,
          confidence: updatedData.confidence,
          status: updatedData.status,
          batchId: updatedData.batchId,
          createdAt: updatedData.createdAt,
          updatedAt: updatedData.updatedAt,
          lastAccessedAt: updatedData.lastAccessedAt,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        message: 'HR data updated successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-EDIT] Failed to update HR data:`, error.message);
      throw error;
    }
  }

  @Delete('data/:id')
  async deleteHrData(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    this.logger.log(`🗑️ [USER-HR-DELETE] Deleting HR data for user ${req.user.id}, ID: ${id}`);
    
    try {
      const deleted = await this.userHrDataService.deleteUserHrData(req.user.id, id);
      
      if (!deleted) {
        return {
          success: false,
          message: 'HR data not found or does not belong to you',
          data: null,
        };
      }
      
      return {
        success: true,
        data: {
          id,
          userId: req.user.id,
        },
        message: 'HR data deleted successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-DELETE] Failed to delete HR data:`, error.message);
      throw error;
    }
  }

  @Delete('data/bulk')
  async bulkDeleteHrData(
    @Request() req: AuthenticatedRequest,
    @Body() body: { ids: string[] }
  ) {
    this.logger.log(`🗑️ [USER-HR-BULK-DELETE] Bulk deleting HR data for user ${req.user.id}`);
    
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('IDs array is required and must not be empty');
    }
    
    try {
      const result = await this.userHrDataService.bulkDeleteUserHrData(req.user.id, body.ids);
      
      return {
        success: true,
        data: {
          deletedCount: result.deletedCount,
          failedIds: result.failedIds,
          totalRequested: body.ids.length,
          userId: req.user.id,
        },
        message: `Successfully deleted ${result.deletedCount} out of ${body.ids.length} records`,
      };
    } catch (error) {
      this.logger.error(`❌ [USER-HR-BULK-DELETE] Failed to bulk delete HR data:`, error.message);
      throw error;
    }
  }
}
