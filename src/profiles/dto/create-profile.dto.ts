import { IsOptional, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsOptional()
  age_range?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  birth_country?: string;

  @IsString()
  @IsOptional()
  sex?: string;

  @IsString()
  @IsOptional()
  marital_status?: string;

  @IsString()
  @IsOptional()
  default_partner_id?: string;

  @IsOptional()
  include_no_partner_events?: boolean;
}

