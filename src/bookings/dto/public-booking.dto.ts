import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
  IsBoolean,
  Min,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO para consultar reservas públicamente
export class QueryPublicBookingsDto {
  @ApiPropertyOptional({
    description: 'ID de la cancha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiPropertyOptional({
    description: 'Fecha de la reserva (YYYY-MM-DD)',
    example: '2024-11-20',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Hora de inicio (HH:mm)',
    example: '14:00',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Hora de fin (HH:mm)',
    example: '16:00',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Estado de la reserva',
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    example: 'confirmed',
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'cancelled', 'completed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Página de resultados',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Resultados por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

// DTO para crear reserva desde app nativa
export class CreatePublicBookingDto {
  @ApiProperty({
    description: 'ID de la cancha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  courtId: string;

  @ApiProperty({
    description: 'Fecha de la reserva (YYYY-MM-DD)',
    example: '2024-11-20',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Hora de inicio (HH:mm)',
    example: '14:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'Hora de fin (HH:mm)',
    example: '16:00',
  })
  @IsString()
  endTime: string;

  @ApiProperty({
    description: 'Precio de la reserva',
    example: 5000,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
    example: 'Reserva para partido de fútbol',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Indica si la reserva es desde app nativa',
    example: true,
    default: true,
  })
  @IsBoolean()
  isAppNative: boolean;

  @ApiProperty({
    description: 'ID del usuario de la app nativa (requerido si isAppNative = true)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ValidateIf((o) => o.isAppNative === true)
  @IsUUID()
  userId: string;

  // Campos opcionales para clientes del dashboard
  @ApiPropertyOptional({
    description: 'ID del cliente (solo si isAppNative = false)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Nombre del cliente (para apps nativas)',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del cliente (para apps nativas)',
    example: '+5491123456789',
  })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({
    description: 'Email del cliente (para apps nativas)',
    example: 'juan@example.com',
  })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({
    description: 'Método de pago',
    example: 'cash',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
