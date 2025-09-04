import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

@Injectable()
export class TextractService {
  private textractClient: TextractClient;

  constructor(private configService: ConfigService) {
    this.textractClient = new TextractClient({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async extractText(filePath: string): Promise<string> {
    const startTime = Date.now();

    
    try {
      // Read file as buffer

      const fileReadStartTime = Date.now();
      const fileBuffer = await require('fs').promises.readFile(filePath);
      const fileReadTime = Date.now() - fileReadStartTime;

      

      const textractStartTime = Date.now();
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: fileBuffer,
        },
      });

      const response = await this.textractClient.send(command);
      const textractTime = Date.now() - textractStartTime;

      
      if (!response.Blocks) {

        throw new Error('No text blocks found in document');
      }


      // Extract text from blocks
      const textBlocks = response.Blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .filter(text => text && text.trim().length > 0);

      const extractedText = textBlocks.join('\n');
      const totalTime = Date.now() - startTime;
      



      
      return extractedText;

    } catch (error) {
      const totalTime = Date.now() - startTime;

      
      // Fallback: try to extract text using basic OCR or return error
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  async extractTextWithConfidence(filePath: string): Promise<{ text: string; confidence: number }> {
    try {
      const fileBuffer = await require('fs').promises.readFile(filePath);
      
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: fileBuffer,
        },
      });

      const response = await this.textractClient.send(command);
      
      if (!response.Blocks) {
        throw new Error('No text blocks found in document');
      }

      const textBlocks = response.Blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => ({
          text: block.Text,
          confidence: block.Confidence || 0,
        }))
        .filter(item => item.text && item.text.trim().length > 0);

      const extractedText = textBlocks.map(item => item.text).join('\n');
      const avgConfidence = textBlocks.reduce((sum, item) => sum + item.confidence, 0) / textBlocks.length;

      return {
        text: extractedText,
        confidence: avgConfidence / 100, // Convert to 0-1 scale
      };

    } catch (error) {

      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }
}
