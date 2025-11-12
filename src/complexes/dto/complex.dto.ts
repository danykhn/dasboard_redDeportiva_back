import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateComplexDto {
  @ApiProperty({ example: 'Complejo Deportivo Central', description: 'Nombre del complejo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Av. Principal 123, Ciudad', description: 'Dirección del complejo' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '+1234567890', description: 'Teléfono de contacto' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'URL de la imagen', required: false })
  @IsString()
  @IsOptional()
  picture?: string;

  @ApiProperty({ example: true, description: 'Estado activo/inactivo', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateComplexDto {
  @ApiProperty({ example: 'Complejo Deportivo Central', description: 'Nombre del complejo', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Av. Principal 123, Ciudad', description: 'Dirección del complejo', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '+1234567890', description: 'Teléfono de contacto', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'URL de la imagen', required: false })
  @IsString()
  @IsOptional()
  picture?: string;

  @ApiProperty({ example: true, description: 'Estado activo/inactivo', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
