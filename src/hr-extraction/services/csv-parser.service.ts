import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

@Injectable()
export class CsvParserService {
  async parseCsv(filePath: string): Promise<{ text: string; rows: any[]; headers: string[] }> {
    const startTime = Date.now();

    
    try {
      const rows: any[] = [];
      const headers: string[] = [];
      let isFirstRow = true;

      return new Promise((resolve, reject) => {

        const fileReadStartTime = Date.now();
        
        createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            if (isFirstRow) {
              headers.push(...Object.keys(row));
              isFirstRow = false;

            }
            rows.push(row);
          })
          .on('end', () => {
            const fileReadTime = Date.now() - fileReadStartTime;

            
            // Convert CSV data to text format for AI processing

            const convertStartTime = Date.now();
            const text = this.convertCsvToText(rows, headers);
            const convertTime = Date.now() - convertStartTime;
            
            const totalTime = Date.now() - startTime;



            
            resolve({
              text,
              rows,
              headers,
            });
          })
          .on('error', (error) => {
            const totalTime = Date.now() - startTime;

            reject(new Error(`CSV parsing failed: ${error.message}`));
          });
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;

      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  private convertCsvToText(rows: any[], headers: string[]): string {
    // Convert CSV data to a readable text format for AI processing
    let text = `CSV Data with ${rows.length} rows and ${headers.length} columns:\n\n`;
    
    // Add headers
    text += `Headers: ${headers.join(', ')}\n\n`;
    
    // Add sample of data (first 10 rows to avoid overwhelming the AI)
    const sampleRows = rows.slice(0, 10);
    text += `Sample Data:\n`;
    
    sampleRows.forEach((row, index) => {
      text += `Row ${index + 1}:\n`;
      headers.forEach(header => {
        const value = row[header] || '';
        text += `  ${header}: ${value}\n`;
      });
      text += '\n';
    });

    if (rows.length > 10) {
      text += `... and ${rows.length - 10} more rows\n`;
    }

    return text;
  }

  async extractSpecificColumns(filePath: string, targetColumns: string[]): Promise<any[]> {
    try {
      const { rows, headers } = await this.parseCsv(filePath);
      
      // Find matching columns (case-insensitive)
      const matchingColumns = headers.filter(header => 
        targetColumns.some(target => 
          header.toLowerCase().includes(target.toLowerCase()) ||
          target.toLowerCase().includes(header.toLowerCase())
        )
      );



      // Extract data from matching columns
      return rows.map(row => {
        const extracted: any = {};
        matchingColumns.forEach(column => {
          extracted[column] = row[column];
        });
        return extracted;
      });

    } catch (error) {

      throw new Error(`Column extraction failed: ${error.message}`);
    }
  }

  async detectHrColumns(filePath: string): Promise<string[]> {
    const hrKeywords = [
      'name', 'email', 'position', 'title', 'company', 'department',
      'phone', 'location', 'address', 'linkedin', 'website', 'manager',
      'employee', 'staff', 'team', 'role', 'job', 'work'
    ];

    try {
      const { headers } = await this.parseCsv(filePath);
      
      const hrColumns = headers.filter(header => 
        hrKeywords.some(keyword => 
          header.toLowerCase().includes(keyword.toLowerCase())
        )
      );


      return hrColumns;

    } catch (error) {

      return [];
    }
  }
}
