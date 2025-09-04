import { HrPersonData } from '../dto/hr-extraction.dto';

export interface GrokAnalysisRequest {
  extractionType: string;
  source: string;
  description?: string;
  batchId?: string;
}

export interface GrokAnalysisResponse {
  people: HrPersonData[];
  confidence: number;
  summary: string;
}
