import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenerateFactDto, FactResponseDto } from './dto/generate-fact.dto';
import { HfChatService } from './hf-chat.service';

@ApiTags('chemistry')
@Controller('chemistry')
export class ChemistryController {
  constructor(private readonly chatService: HfChatService) {}

  @Post('fact')
  @ApiOperation({
    summary: 'Generate a short educational fact for Chemistry Corner',
    description:
      'Proxies a preset system prompt to Hugging Face chat completions. Frontend supplies the user prompt/topic.',
  })
  @ApiOkResponse({ type: FactResponseDto })
  async generateFact(@Body() body: GenerateFactDto): Promise<FactResponseDto> {
    const fact = await this.chatService.generateFact(body.prompt);
    return { fact };
  }
}



