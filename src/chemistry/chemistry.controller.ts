import { Body, Controller, Post, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { GenerateFactDto, FactResponseDto } from './dto/generate-fact.dto';
import { HfChatService } from './hf-chat.service';

@Controller('chemistry')
export class ChemistryController {
  private readonly logger = new Logger(ChemistryController.name);

  constructor(private readonly chatService: HfChatService) {}

  @Post('fact')
  async generateFact(@Body() body: GenerateFactDto): Promise<FactResponseDto> {
    const startTime = Date.now();
    this.logger.log(`[POST /chemistry/fact] Request received`, {
      prompt: body.prompt?.substring(0, 50) + (body.prompt?.length > 50 ? '...' : ''),
      promptLength: body.prompt?.length,
    });

    try {
      if (!body.prompt) {
        this.logger.warn('[POST /chemistry/fact] Missing prompt in request body');
        throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
      }

      const fact = await this.chatService.generateFact(body.prompt);
      const duration = Date.now() - startTime;
      
      this.logger.log(`[POST /chemistry/fact] Success`, {
        duration: `${duration}ms`,
        factLength: fact.length,
      });

      return { fact };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[POST /chemistry/fact] Error after ${duration}ms`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}



