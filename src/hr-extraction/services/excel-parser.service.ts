import { Injectable, Logger } from '@nestjs/common';
import XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExcelParseResult {
  success: boolean;
  data?: string;
  error?: string;
  processingTime: number;
}

@Injectable()
export class ExcelParserService {
  private readonly logger = new Logger(ExcelParserService.name);

  async parseExcel(filePath: string): Promise<ExcelParseResult> {
    const startTime = Date.now();
    
    try {

      
      // Read the Excel file

      const fileBuffer = await fs.readFile(filePath);

      
      // Parse Excel file

      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }
      

      
      // Convert to CSV

      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      if (!csvData || csvData.trim().length === 0) {
        throw new Error('Excel file appears to be empty or contains no data');
      }
      

      
      const processingTime = Date.now() - startTime;

      
      return {
        success: true,
        data: csvData,
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = `Excel parsing failed after ${processingTime}ms: ${error.message}`;

      
      return {
        success: false,
        error: errorMessage,
        processingTime
      };
    }
  }
}
