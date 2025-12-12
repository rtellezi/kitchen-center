import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateFactDto {
  @ApiProperty({
    example: 'Generate a fact about the psychology of love.',
    description:
      'Prompt sent to the model. The API uses a preset system prompt to keep tone and safety.',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  prompt!: string;
}

export class FactResponseDto {
  @ApiProperty({
    example:
      'Falling in love triggers dopamine pathways similar to early-stage learning, boosting focus and memory on a partner.',
  })
  fact!: string;
}



