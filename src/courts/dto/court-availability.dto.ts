import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

export enum BlockReason {
  MAINTENANCE = 'maintenance',
  PRIVATE_EVENT = 'private_event',
  WEATHER = 'weather',
  OTHER = 'other',
}

export class CreateCourtAvailabilityDto {
  @ApiProperty({
    description: 'ID de la cancha a bloquear',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({
    description: 'Fecha de inicio del bloqueo (YYYY-MM-DD)',
    example: '2024-01-20',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin del bloqueo (YYYY-MM-DD)',
    example: '2024-01-25',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Hora de inicio del bloqueo (HH:mm). Si se omite, bloquea todo el día',
    example: '14:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime debe estar en formato HH:mm',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Hora de fin del bloqueo (HH:mm). Si se omite, bloquea todo el día',
    example: '18:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime debe estar en formato HH:mm',
  })
  @ValidateIf((o) => o.startTime !== undefined)
  endTime?: string;

  @ApiProperty({
    description: 'Razón del bloqueo',
    enum: BlockReason,
    example: BlockReason.MAINTENANCE,
  })
  @IsEnum(BlockReason)
  @IsNotEmpty()
  reason: BlockReason;

  @ApiPropertyOptional({
    description: 'Descripción adicional del bloqueo',
    example: 'Reparación de césped sintético',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCourtAvailabilityDto extends PartialType(
  CreateCourtAvailabilityDto,
) {}

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'ID de la cancha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({
    description: 'Fecha de la reserva (YYYY-MM-DD)',
    example: '2024-01-20',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Hora de inicio (HH:mm)',
    example: '14:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime debe estar en formato HH:mm',
  })
  startTime: string;

  @ApiProperty({
    description: 'Hora de fin (HH:mm)',
    example: '16:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime debe estar en formato HH:mm',
  })
  endTime: string;
}
