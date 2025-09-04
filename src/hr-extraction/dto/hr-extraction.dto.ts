import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum ExtractionType {
  RESUME = 'resume',
  BUSINESS_CARD = 'business_card',
  COMPANY_DIRECTORY = 'company_directory',
  GENERAL = 'general',
}

export class HrExtractionDto {
  @IsOptional()
  @IsEnum(ExtractionType)
  extractionType?: ExtractionType;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export interface HrPersonData {
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
}

export interface ExtractionResult {
  success: boolean;
  data: {
    people: HrPersonData[];
    metadata: {
      totalPeople: number;
      extractionType: string;
      source: string;
      processedAt: string;
      confidence: number;
      batchId?: string;
    };
  };
  message: string;
  processingTime: string;
  rawData?: string;
}
