import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

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
}
