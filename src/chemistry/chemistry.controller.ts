import { Body, Controller, Post } from '@nestjs/common';
import { GenerateFactDto, FactResponseDto } from './dto/generate-fact.dto';
import { HfChatService } from './hf-chat.service';

@Controller('chemistry')
export class ChemistryController {
  constructor(private readonly chatService: HfChatService) {}

  @Post('fact')
  async generateFact(@Body() body: GenerateFactDto): Promise<FactResponseDto> {
    const fact = await this.chatService.generateFact(body.prompt);
    return { fact };
  }
}



