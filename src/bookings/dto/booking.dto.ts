import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Fecha de la reserva (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiProperty({
    description: 'Hora de inicio (ISO 8601)',
    example: '2024-12-25T14:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Hora de fin (ISO 8601)',
    example: '2024-12-25T15:30:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    description: 'Duración en minutos',
    example: 90,
    minimum: 15,
    maximum: 480,
  })
  @IsNumber()
  @Min(15)
  @Max(480)
  duration: number;

  @ApiProperty({
    description: 'Precio de la reserva',
    example: 50.00,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Estado de la reserva',
    example: 'pending',
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  })
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'confirmed', 'cancelled', 'completed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Método de pago',
    example: 'cash',
    enum: ['cash', 'card', 'transfer', 'other'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['cash', 'card', 'transfer', 'other'])
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Estado del pago',
    example: 'pending',
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  })
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'paid', 'refunded'])
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales de la reserva',
    example: 'Reserva para torneo interno',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({
    description: 'ID de la cancha',
    example: 'uuid-de-la-cancha',
  })
  @IsUUID()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({
    description: 'ID del cliente',
    example: 'uuid-del-cliente',
  })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;
}

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingDate: Date;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  paymentMethod?: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  courtId: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  court?: any;

  @ApiPropertyOptional()
  client?: any;
}

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'ID de la cancha',
    example: 'uuid-de-la-cancha',
  })
  @IsUUID()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({
    description: 'Fecha a consultar (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    description: 'Hora de inicio para verificar disponibilidad (ISO 8601)',
    example: '2024-12-25T14:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Hora de fin para verificar disponibilidad (ISO 8601)',
    example: '2024-12-25T15:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}

export class AvailabilitySlot {
  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  available: boolean;

  @ApiPropertyOptional()
  bookingId?: string;
}
