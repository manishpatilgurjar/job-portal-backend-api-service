import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HrExtractionController } from './hr-extraction.controller';
import { UserHrExtractionController } from './controllers/user-hr-extraction.controller';
import { HrExtractionService } from './services/hr-extraction.service';
import { UserHrExtractionService } from './services/user-hr-extraction.service';
import { FileUploadService } from './services/file-upload.service';
import { TextractService } from './services/textract.service';
import { GrokService } from './services/grok.service';
import { PdfParserService } from './services/pdf-parser.service';
import { CsvParserService } from './services/csv-parser.service';
import { ExcelParserService } from './services/excel-parser.service';
import { BackgroundProcessingService } from './services/background-processing.service';
import { MongoDBService } from '../database/services/mongodb.service';
import { UserHrDataService } from '../database/services/user-hr-data.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { winstonConfig } from '../common/logger/winston.config';

@Module({
  imports: [
    ConfigModule, 
    DatabaseModule,
    AuthModule
  ],
  controllers: [HrExtractionController, UserHrExtractionController],
  providers: [
    HrExtractionService,
    UserHrExtractionService,
    FileUploadService,
    TextractService,
    GrokService,
    PdfParserService,
    CsvParserService,
    ExcelParserService,
    BackgroundProcessingService,
    MongoDBService,
    UserHrDataService,
  ],
  exports: [HrExtractionService, UserHrExtractionService, BackgroundProcessingService, MongoDBService, UserHrDataService],
})
export class HrExtractionModule {
  constructor() {
    winstonConfig.log('📋 HR Extraction Module initialized', 'HrExtractionModule');
    winstonConfig.log('🔧 Available services: FileUpload, Textract, Grok, PdfParser, CsvParser, ExcelParser, BackgroundProcessing', 'HrExtractionModule');
  }
}
