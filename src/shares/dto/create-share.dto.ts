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
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsOptional()
  @IsString({ each: true })
  includedPartnerIds?: string[];

  @IsOptional()
  includeNoPartnerEvents?: boolean;
}
