import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateShareDto {
  @IsString()
  @IsOptional()
  name?: string;
  
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
  
  @IsDateString()
  @IsOptional()
  dateFrom?: string;
  
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
