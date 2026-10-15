import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ example: 'InstaDeco' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Ameublement' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  category!: string;

  @ApiProperty({ example: '-15% sur le mobilier étudiant' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  offer!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '-15%' })
  @IsOptional() @IsString() @MaxLength(30)
  discount?: string;

  @ApiPropertyOptional({ example: 'STUDHUB15' })
  @IsOptional() @IsString() @MaxLength(50)
  promoCode?: string;

  @ApiProperty({ example: 'https://…/logo.png' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  logoUrl!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'https://instadeco.tn' })
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500)
  websiteUrl?: string;

  @ApiPropertyOptional({ example: '22456789' })
  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'partner@studhub.tn', description: 'Email de connexion du compte partenaire' })
  @IsOptional() @IsEmail() @MaxLength(255)
  loginEmail?: string;

  @ApiPropertyOptional({ description: 'Mot de passe du compte partenaire (min 6)' })
  @IsOptional() @IsString() @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional() @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Ordre d\'affichage (plus petit = en premier)' })
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {}

export class PartnerQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  category?: string;
}

export class CreatePartnerAnnouncementDto {
  @ApiProperty({ example: '-15% sur le mobilier étudiant' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '-15%' })
  @IsOptional() @IsString() @MaxLength(30)
  discount?: string;

  @ApiPropertyOptional({ example: 'STUDHUB15' })
  @IsOptional() @IsString() @MaxLength(50)
  promoCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional() @IsDateString()
  validUntil?: string;
}

export class UpdatePartnerAnnouncementDto extends PartialType(CreatePartnerAnnouncementDto) {}
