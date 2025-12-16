import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsOptional()
  name?: string;
  
  @IsDateString()
  expiresAt!: string;
  
  @IsDateString()
  @IsOptional()
  dateFrom?: string;
  
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
