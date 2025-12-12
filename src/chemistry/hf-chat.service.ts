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
    const token = this.configService.getOrThrow<string>('HF_TOKEN');
    const model = this.configService.getOrThrow<string>('HF_MODEL');
    const apiUrl = this.configService.getOrThrow<string>('HF_API_URL');
    const maxTokens = this.configService.get<number>('HF_MAX_TOKENS');
    const temperature = this.configService.get<number>('HF_TEMPERATURE');

    const messages: HfChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    try {
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

      const fact = response.data?.choices?.[0]?.message?.content?.trim();
      if (!fact) {
        this.logger.error(`Unexpected Hugging Face response: ${JSON.stringify(response.data)}`);
        throw new InternalServerErrorException('No fact returned from model');
      }
      return fact;
    } catch (error) {
      this.logger.error('Failed to call Hugging Face router', error as Error);
      throw new InternalServerErrorException('Unable to generate fact at this time');
    }
  }
}



