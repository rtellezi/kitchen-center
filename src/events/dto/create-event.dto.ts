import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, Max, Min, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsDateString()
  date!: string; // ISO Date string

  @IsNumber()
  @Min(1)
  @Max(5)
  intensity!: number;

  @IsEnum(['day', 'night'])
  time_of_day!: 'day' | 'night';

  @IsBoolean()
  is_cycle!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @IsOptional()
  @IsString({ each: true })
  partnerIds?: string[];
}
