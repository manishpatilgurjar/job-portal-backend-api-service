import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { GrokAnalysisRequest, GrokAnalysisResponse } from '../interfaces/grok.interface';
import { HrPersonData } from '../dto/hr-extraction.dto';
import { winstonConfig } from '../../common/logger/winston.config';

@Injectable()
export class GrokService {
  private readonly grokApiUrl: string;
  private readonly grokApiKey: string;

  constructor(private configService: ConfigService) {
    this.grokApiUrl =
      this.configService.get<string>('GROK_API_URL') ||
      'https://api.groq.com/openai/v1/chat/completions';
    this.grokApiKey = this.configService.get<string>('GROK_API_KEY') || '';

    // Only log API key preview if key is present

    winstonConfig.log(
      `🔑 [GROK-AI] API Key loaded: ${this.grokApiKey ? 'YES' : 'NO'}`,
      'GrokService'
    );
    if (this.grokApiKey) {
      winstonConfig.log(
        `🔑 [GROK-AI] API Key length: ${this.grokApiKey.length} characters`,
        'GrokService'
      );
      winstonConfig.log(
        `🔑 [GROK-AI] API Key preview: ${this.grokApiKey.substring(0, 10)}...`,
        'GrokService'
      );
    }
  }

  async analyzeHrData(
    text: string,
    request: GrokAnalysisRequest,
    onChunkComplete?: (chunkData: any) => Promise<void>
  ): Promise<GrokAnalysisResponse> {
    const startTime = Date.now();





    // Debug API key at runtime

    winstonConfig.log(
      `🔑 [GROK-AI] API Key loaded: ${this.grokApiKey ? 'YES' : 'NO'}`,
      'GrokService'
    );
    if (this.grokApiKey) {
      winstonConfig.log(
        `🔑 [GROK-AI] API Key length: ${this.grokApiKey.length} characters`,
        'GrokService'
      );
      winstonConfig.log(
        `🔑 [GROK-AI] API Key preview: ${this.grokApiKey.substring(0, 10)}...`,
        'GrokService'
      );
    }

    try {
      // Check if text is too large and needs chunking
      const maxChunkSize = 50000; // 50k characters per chunk
      const needsChunking = text.length > maxChunkSize;

      if (needsChunking) {
        winstonConfig.log(
          `📦 [GROK-AI] Text too large (${text.length} chars), splitting into chunks...`,
          'GrokService'
        );
        return await this.analyzeHrDataInChunks(text, request, maxChunkSize, onChunkComplete);
      } else {
        winstonConfig.log(
          `📝 [GROK-AI] Text size OK, processing in single request...`,
          'GrokService'
        );
        const result = await this.analyzeHrDataSingle(text, request);
        
        // Save data immediately if callback provided
        if (onChunkComplete && result.people.length > 0) {

          await onChunkComplete({
            people: result.people,
            confidence: result.confidence,
            chunkIndex: 0,
            totalChunks: 1,
            batchId: request.batchId || crypto.randomUUID(),
            extractionType: request.extractionType,
            source: request.source,
            description: request.description,
          });
        }
        
        return result;
      }
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      winstonConfig.error(
        `❌ [GROK-AI] Analysis failed after ${totalTime}ms: ${error?.message || error}`,
        'GrokService'
      );
      throw new Error(
        `AI analysis failed: ${error?.message || JSON.stringify(error)}`
      );
    }
  }

  private async analyzeHrDataInChunks(
    text: string,
    request: GrokAnalysisRequest,
    maxChunkSize: number,
    onChunkComplete?: (chunkData: any) => Promise<void>
  ): Promise<GrokAnalysisResponse> {
    const startTime = Date.now();


    // Split text into chunks
    const chunks = this.splitTextIntoChunks(text, maxChunkSize);


    const allPeople: HrPersonData[] = [];
    let totalConfidence = 0;
    let processedChunks = 0;
    let failedChunks = 0;

    // Process each chunk with retry logic
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      winstonConfig.log(
        `📦 [GROK-AI-CHUNKS] Processing chunk ${i + 1}/${
          chunks.length
        } (${chunk.length} chars)...`,
        'GrokService'
      );
      winstonConfig.log(
        `📄 [GROK-AI-CHUNKS] Chunk ${i + 1} preview: ${chunk.substring(
          0,
          200
        )}...`,
        'GrokService'
      );

      let chunkProcessed = false;
      let retryCount = 0;
      const maxRetries = 2;

      while (!chunkProcessed && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            winstonConfig.log(
              `🔄 [GROK-AI-CHUNKS] Retry ${retryCount}/${maxRetries} for chunk ${
                i + 1
              }...`,
              'GrokService'
            );
            // Wait longer on retry
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * retryCount)
            );
          }

          const chunkResult = await this.analyzeHrDataSingle(chunk, {
            ...request,
            source: `${request.source} - Chunk ${i + 1}/${chunks.length}`,
          });

          allPeople.push(...chunkResult.people);
          totalConfidence += chunkResult.confidence;
          processedChunks++;
          chunkProcessed = true;

          winstonConfig.log(
            `✅ [GROK-AI-CHUNKS] Chunk ${i + 1} completed - found ${chunkResult.people.length} people`,
            'GrokService'
          );
          winstonConfig.log(
            `📊 [GROK-AI-CHUNKS] Running total: ${allPeople.length} people so far`,
            'GrokService'
          );

          // Save chunk data immediately if callback provided
          if (onChunkComplete && chunkResult.people.length > 0) {

            try {
              await onChunkComplete({
                people: chunkResult.people,
                confidence: chunkResult.confidence,
                chunkIndex: i,
                totalChunks: chunks.length,
                batchId: request.batchId || crypto.randomUUID(),
                extractionType: request.extractionType,
                source: request.source,
                description: request.description,
              });

            } catch (saveError) {

            }
          }
        } catch (error: any) {
          retryCount++;
          winstonConfig.error(
            `❌ [GROK-AI-CHUNKS] Chunk ${i + 1} attempt ${retryCount} failed: ${error?.message || error}`,
            'GrokService'
          );

          if (retryCount > maxRetries) {
            failedChunks++;
            winstonConfig.error(
              `❌ [GROK-AI-CHUNKS] Chunk ${i + 1} failed after ${maxRetries} retries, skipping...`,
              'GrokService'
            );
          }
        }
      }

      // Add delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        winstonConfig.log(
          `⏳ [GROK-AI-CHUNKS] Waiting 1.5 seconds before next chunk...`,
          'GrokService'
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }







    // Remove duplicates based on email
    const uniquePeople = this.removeDuplicatePeople(allPeople);
    const avgConfidence =
      processedChunks > 0 ? totalConfidence / processedChunks : 0;

    const totalTime = Date.now() - startTime;
    winstonConfig.log(
      `🎉 [GROK-AI-CHUNKS] Chunked analysis completed in ${totalTime}ms`,
      'GrokService'
    );
    winstonConfig.log(
      `👥 [GROK-AI-CHUNKS] Total people found: ${allPeople.length}, Unique: ${uniquePeople.length}`,
      'GrokService'
    );
    winstonConfig.log(
      `📊 [GROK-AI-CHUNKS] Average confidence: ${avgConfidence.toFixed(2)}`,
      'GrokService'
    );
    winstonConfig.log(
      `📈 [GROK-AI-CHUNKS] Success rate: ${(
        (processedChunks / chunks.length) *
        100
      ).toFixed(1)}%`,
      'GrokService'
    );

    return {
      people: uniquePeople,
      confidence: avgConfidence,
      summary: `Processed ${processedChunks}/${chunks.length} chunks successfully, found ${uniquePeople.length} unique people`,
    };
  }

  private async analyzeHrDataSingle(
    text: string,
    request: GrokAnalysisRequest
  ): Promise<GrokAnalysisResponse> {

    const promptStartTime = Date.now();
    const prompt = this.buildPrompt(text, request);
    const promptTime = Date.now() - promptStartTime;
    winstonConfig.log(
      `✅ [GROK-AI-SINGLE] Prompt built in ${promptTime}ms (${prompt.length} characters)`,
      'GrokService'
    );

    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 10000; // 10 seconds base delay for rate limiting

    while (retryCount <= maxRetries) {
      try {
        winstonConfig.log(
          `🚀 [GROK-AI-SINGLE] Sending request to Grok API (attempt ${
            retryCount + 1
          }/${maxRetries + 1})...`,
          'GrokService'
        );

        const apiStartTime = Date.now();

        // Use global fetch if available, otherwise require node-fetch
        let fetchFn: typeof fetch;
        if (typeof fetch !== 'undefined') {
          fetchFn = fetch;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          fetchFn = require('node-fetch');
        }

        const response = await fetchFn(this.grokApiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.grokApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert HR data extraction AI. Extract person information from text and return structured JSON data.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });

        const apiTime = Date.now() - apiStartTime;
        winstonConfig.log(
          `✅ [GROK-AI-SINGLE] Grok API response received in ${apiTime}ms`,
          'GrokService'
        );

        if (response.status === 429) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          winstonConfig.log(
            `⏳ [GROK-AI-SINGLE] Rate limited. Waiting ${delay}ms before retry ${
              retryCount + 1
            }...`,
            'GrokService'
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = '[Failed to read error text]';
          }
          winstonConfig.error(
            `❌ [GROK-AI-SINGLE] API error: ${response.status} ${response.statusText}`,
            'GrokService'
          );

          throw new Error(
            `Grok API error: ${response.status} ${response.statusText}`
          );
        }


        const parseStartTime = Date.now();
        let data: any;
        try {
          data = await response.json();
        } catch (e) {
          throw new Error('Failed to parse JSON from Grok API');
        }
        const parseTime = Date.now() - parseStartTime;
        winstonConfig.log(
          `✅ [GROK-AI-SINGLE] Response parsed in ${parseTime}ms`,
          'GrokService'
        );

        const content =
          data?.choices?.[0]?.message?.content ||
          data?.choices?.[0]?.text ||
          '';

        if (!content) {

          throw new Error('No response from Grok API');
        }

        winstonConfig.log(
          `📝 [GROK-AI-SINGLE] AI response length: ${content.length} characters`,
          'GrokService'
        );
        winstonConfig.log(
          `📄 [GROK-AI-SINGLE] AI response preview: ${content.substring(
            0,
            200
          )}...`,
          'GrokService'
        );

        // Parse the JSON response

        const jsonParseStartTime = Date.now();
        const result = this.parseGrokResponse(content);
        const jsonParseTime = Date.now() - jsonParseStartTime;

        winstonConfig.log(
          `✅ [GROK-AI-SINGLE] JSON parsing completed in ${jsonParseTime}ms`,
          'GrokService'
        );
        winstonConfig.log(
          `👥 [GROK-AI-SINGLE] Found ${result.people.length} people with confidence ${result.confidence}`,
          'GrokService'
        );

        return result;
      } catch (error: any) {
        winstonConfig.error(
          `❌ [GROK-AI-SINGLE] Error on attempt ${retryCount + 1}: ${
            error?.message || error
          }`,
          'GrokService'
        );

        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          winstonConfig.log(
            `⏳ [GROK-AI-SINGLE] Retrying in ${delay}ms...`,
            'GrokService'
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  private splitTextIntoChunks(
    text: string,
    maxChunkSize: number
  ): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';
    let chunkIndex = 0;

    winstonConfig.log(
      `📦 [GROK-AI-CHUNKS] Starting to split ${text.length} characters into chunks...`,
      'GrokService'
    );


    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // If adding this line would exceed max size, save current chunk and start new one
      if (
        currentChunk.length + line.length + 1 > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        winstonConfig.log(
          `📦 [GROK-AI-CHUNKS] Chunk ${chunkIndex + 1} created: ${
            currentChunk.length
          } chars`,
          'GrokService'
        );
        chunkIndex++;
        currentChunk = line;
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      winstonConfig.log(
        `📦 [GROK-AI-CHUNKS] Final chunk ${chunkIndex + 1} created: ${
          currentChunk.length
        } chars`,
        'GrokService'
      );
    }

    winstonConfig.log(
      `📦 [GROK-AI-CHUNKS] Split into ${chunks.length} chunks: ${chunks.map((c, i) => `Chunk ${i + 1}: ${c.length} chars`).join(', ')}`,
      'GrokService'
    );
    winstonConfig.log(
      `📦 [GROK-AI-CHUNKS] Total characters in chunks: ${chunks.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      )}`,
      'GrokService'
    );
    winstonConfig.log(
      `📦 [GROK-AI-CHUNKS] Original text length: ${text.length}`,
      'GrokService'
    );

    return chunks;
  }

  private removeDuplicatePeople(people: HrPersonData[]): HrPersonData[] {
    const seen = new Set<string>();
    const unique: HrPersonData[] = [];

    for (const person of people) {
      const key =
        person.email?.toLowerCase() ||
        `${person.name?.toLowerCase() || ''}-${person.company?.toLowerCase() || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(person);
      }
    }

    winstonConfig.log(
      `🔄 [GROK-AI-CHUNKS] Removed ${people.length - unique.length} duplicates`,
      'GrokService'
    );
    return unique;
  }

  private buildPrompt(text: string, request: GrokAnalysisRequest): string {
    return `
You are an expert HR data extraction AI. Extract ALL person information from the following text and return a JSON response.

EXTRACTION TYPE: ${request.extractionType}
SOURCE: ${request.source}
${request.description ? `DESCRIPTION: ${request.description}` : ''}

TEXT TO ANALYZE:
${text}

CRITICAL INSTRUCTIONS:
- Extract EVERY SINGLE person mentioned in this text
- Look for patterns like: Name, Email, Title, Company
- Even if data is incomplete, extract what you can find
- Don't miss any person - scan the entire text carefully
- Look for table rows, lists, and any structured data

Return a JSON response in this exact format:
{
  "people": [
    {
      "name": "Full Name",
      "email": "email@example.com",
      "position": "Job Title",
      "company": "Company Name",
      "phone": "Phone Number (optional)",
      "location": "Location (optional)",
      "department": "Department (optional)",
      "linkedin": "LinkedIn URL (optional)",
      "website": "Website URL (optional)",
      "additionalInfo": "Any additional relevant information (optional)"
    }
  ],
  "confidence": 0.85,
  "summary": "Brief summary of what was extracted"
}

EXTRACTION RULES:
1. Extract ALL people - don't skip anyone
2. If information is missing, use null or empty string
3. Clean and normalize the data (proper case, trim whitespace)
4. For emails, ensure they are valid format
5. For names, use full names when available
6. Look for patterns like "Name, Email, Title, Company" in tables
7. Extract even partial information
8. Be conservative with confidence scores (0.0 to 1.0)
9. Return valid JSON only, no additional text
10. Count how many people you found and mention in summary

Remember: Your goal is to extract EVERY person from this text, not just a few examples!
`;
  }

  private parseGrokResponse(content: string): GrokAnalysisResponse {
    try {

      
      // Try multiple methods to extract JSON
      let jsonStr = '';
      
      // Method 1: Look for JSON code block
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1].trim();

      } else {
        // Method 2: Find the first and last curly braces
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = content.substring(firstBrace, lastBrace + 1);

        } else {
          throw new Error('No JSON found in response');
        }
      }

      // Try to fix incomplete JSON by finding the last complete person object
      let fixedJsonStr = jsonStr;
      
      // If JSON seems incomplete, try to extract complete person objects
      if (!jsonStr.trim().endsWith('}')) {

        
        // Find all complete person objects
        const personMatches = jsonStr.match(/\{\s*"name"[^}]*\}/g);
        if (personMatches && personMatches.length > 0) {
          const peopleArray = personMatches.map(match => {
            try {
              return JSON.parse(match);
            } catch (e) {
              return null;
            }
          }).filter(Boolean);
          
          if (peopleArray.length > 0) {
            fixedJsonStr = JSON.stringify({
              people: peopleArray,
              confidence: 0.8,
              summary: 'HR data extracted successfully'
            });

          }
        }
      }

      let parsed: any;
      try {
        parsed = JSON.parse(fixedJsonStr);
      } catch (e) {
        // Try to fix common JSON issues (e.g., trailing commas, incomplete objects)
        const fixed = fixedJsonStr
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*$/, '') // Remove trailing commas
          .replace(/\}\s*$/, '}'); // Ensure proper closing
        
        try {
          parsed = JSON.parse(fixed);
        } catch (e2) {
          // Last resort: try to extract individual person objects
          const personMatches = fixedJsonStr.match(/\{\s*"name"[^}]*\}/g);
          if (personMatches && personMatches.length > 0) {
            const peopleArray = personMatches.map(match => {
              try {
                return JSON.parse(match);
              } catch (e) {
                return null;
              }
            }).filter(Boolean);
            
            parsed = {
              people: peopleArray,
              confidence: 0.7,
              summary: 'HR data extracted successfully'
            };

          } else {
            throw e2;
          }
        }
      }

      // Validate the response structure
      if (!parsed.people || !Array.isArray(parsed.people)) {
        throw new Error('Invalid response structure: missing people array');
      }

      // Clean and validate each person's data
      const cleanedPeople: HrPersonData[] = parsed.people
        .filter((person: any) => person && person.name) // Filter out invalid entries
        .map((person: any) => ({
          name: this.cleanString(person.name),
          email: this.cleanEmail(person.email),
          position: this.cleanString(person.position),
          company: this.cleanString(person.company),
          phone: this.cleanString(person.phone),
          location: this.cleanString(person.location),
          department: this.cleanString(person.department),
          linkedin: this.cleanString(person.linkedin),
          website: this.cleanString(person.website),
          additionalInfo: this.cleanString(person.additionalInfo),
        }));




      return {
        people: cleanedPeople,
        confidence: Math.max(
          0,
          Math.min(1, typeof parsed.confidence === 'number' ? parsed.confidence : 0.5)
        ),
        summary: this.cleanString(parsed.summary) || 'HR data extracted successfully',
      };
    } catch (error: any) {



      // Fallback: return empty result
      return {
        people: [],
        confidence: 0.1,
        summary: 'Failed to parse AI response',
      };
    }
  }

  private cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') return String(value).trim();
    return value.trim();
  }

  private cleanEmail(value: any): string {
    const email = this.cleanString(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email : '';
  }
}
