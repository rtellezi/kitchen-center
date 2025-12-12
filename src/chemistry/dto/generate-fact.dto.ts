import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateFactDto {
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  prompt!: string;
}

export class FactResponseDto {
  fact!: string;
}



