import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const SYSTEM_PROMPT =
  'You are a helpful assistant that generates fun, educational facts about intimacy, love, and sexual health for a section called "Chemistry Corner".\n' +
  'RULES: 1. Generate ONLY 1 sentence fact\n' +
  '2. Keep tone: playful and light while staying scientifically grounded\n' +
  '3. Topics can include: human biology/physiology related to intimacy or attraction, psychological aspects of love/relationships/attraction, historical trivia about relationships/marriage/intimacy customs, relationship science/interpersonal dynamics, sexual health/wellness/safety, or any other interesting aspect of intimacy, love, or sexual health\n' +
  '4. Include explicit content or inappropriate language only if it has scientific basis\n' +
  '5. Always make it educational and interesting\n' +
  '6. Format: Plain text only, no markdown, no quotes';

type HfChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type HfChoice = {
  index: number;
  finish_reason?: string;
  message: HfChatMessage;
};

type HfChatResponse = {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: HfChoice[];
};

@Injectable()
export class HfChatService {
  private readonly logger = new Logger(HfChatService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generateFact(prompt: string): Promise<string> {
    this.logger.log('generateFact called', { promptLength: prompt.length });
    
    const token = this.configService.getOrThrow<string>('HF_TOKEN');
    const model = this.configService.getOrThrow<string>('HF_MODEL');
    const apiUrl = this.configService.getOrThrow<string>('HF_API_URL');
    const maxTokens = this.configService.get<number>('HF_MAX_TOKENS');
    const temperature = this.configService.get<number>('HF_TEMPERATURE');

    this.logger.debug('HF Config', {
      model,
      apiUrl,
      maxTokens,
      temperature,
      hasToken: !!token,
    });

    const messages: HfChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    try {
      this.logger.log('Calling Hugging Face API...');
      const startTime = Date.now();
      
      const response = await firstValueFrom(
        this.httpService.post<HfChatResponse>(
          apiUrl,
          {
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(`HF API response received in ${duration}ms`, {
        status: response.status,
        hasChoices: !!response.data?.choices?.length,
      });

      const fact = response.data?.choices?.[0]?.message?.content?.trim();
      if (!fact) {
        this.logger.error('Unexpected Hugging Face response', {
          responseData: JSON.stringify(response.data),
          choicesLength: response.data?.choices?.length,
        });
        throw new InternalServerErrorException('No fact returned from model');
      }

      this.logger.log('Fact generated successfully', { factLength: fact.length });
      return fact;
    } catch (error) {
      this.logger.error('Failed to call Hugging Face router', {
        error: error instanceof Error ? error.message : String(error),
        apiUrl,
        hasToken: !!token,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Unable to generate fact at this time');
    }
  }
}



