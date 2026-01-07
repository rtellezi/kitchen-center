import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsHexColor } from 'class-validator';

export class CreatePartnerDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    @IsBoolean()
    @IsOptional()
    isVisible?: boolean;
}
