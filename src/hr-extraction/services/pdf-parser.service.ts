import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import pdf from 'pdf-parse';

@Injectable()
export class PdfParserService {
  async parsePdf(filePath: string): Promise<{ text: string; pages: number; metadata: any }> {
    const startTime = Date.now();

    
    try {

      const fileReadStartTime = Date.now();
      const dataBuffer = await fs.readFile(filePath);
      const fileReadTime = Date.now() - fileReadStartTime;

      

      const parseStartTime = Date.now();
      const data = await pdf(dataBuffer);
      const parseTime = Date.now() - parseStartTime;

      const totalTime = Date.now() - startTime;



      
      return {
        text: data.text,
        pages: data.numpages,
        metadata: {
          info: data.info,
          version: data.version,
          pages: data.numpages,
        },
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;

      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    const result = await this.parsePdf(filePath);
    return result.text;
  }

  async getPdfMetadata(filePath: string): Promise<any> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        title: data.info?.Title || '',
        author: data.info?.Author || '',
        subject: data.info?.Subject || '',
        creator: data.info?.Creator || '',
        producer: data.info?.Producer || '',
        creationDate: data.info?.CreationDate || '',
        modificationDate: data.info?.ModDate || '',
        pages: data.numpages,
        version: data.version,
      };
    } catch (error) {

      return {};
    }
  }
}
