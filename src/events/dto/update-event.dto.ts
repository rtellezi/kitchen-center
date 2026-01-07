import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, Max, Min, IsString, MaxLength } from 'class-validator';

export class UpdateEventDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  intensity?: number;

  @IsEnum(['day', 'night'])
  @IsOptional()
  time_of_day?: 'day' | 'night';

  @IsBoolean()
  @IsOptional()
  is_cycle?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @IsOptional()
  @IsString({ each: true })
  partnerIds?: string[];
}
