import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateCourtDto {
  @ApiProperty({ example: 'Cancha de Fútbol 1', description: 'Nombre de la cancha' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Cancha de fútbol 11 con césped sintético', description: 'Descripción de la cancha', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/court.jpg', description: 'URL de la imagen', required: false })
  @IsString()
  @IsOptional()
  picture?: string;

  @ApiProperty({ example: true, description: 'Estado activo/inactivo', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'uuid-del-complejo', description: 'ID del complejo al que pertenece' })
  @IsUUID()
  @IsNotEmpty()
  complexId: string;
}

export class UpdateCourtDto {
  @ApiProperty({ example: 'Cancha de Fútbol 1', description: 'Nombre de la cancha', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Cancha de fútbol 11 con césped sintético', description: 'Descripción de la cancha', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/court.jpg', description: 'URL de la imagen', required: false })
  @IsString()
  @IsOptional()
  picture?: string;

  @ApiProperty({ example: true, description: 'Estado activo/inactivo', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'uuid-del-complejo', description: 'ID del complejo al que pertenece', required: false })
  @IsUUID()
  @IsOptional()
  complexId?: string;
}
