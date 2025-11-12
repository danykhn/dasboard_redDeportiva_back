import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsIn, IsNumber, Min } from 'class-validator';

export class DashboardStatsQueryDto {
  @ApiPropertyOptional({
    description: 'ID del complejo. Si no se envía, agrega todos los complejos del usuario',
    example: 'uuid-del-complejo',
  })
  @IsOptional()
  @IsUUID()
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Fecha inicio (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha fin (YYYY-MM-DD)',
    example: '2025-11-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Período predefinido',
    enum: ['today', 'week', 'month', 'year'],
    example: 'month',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year'])
  period?: string;
}

export class RecentActivityQueryDto {
  @ApiPropertyOptional({ description: 'ID del complejo' })
  @IsOptional()
  @IsUUID()
  complexId?: string;

  @ApiPropertyOptional({ description: 'Límite de resultados', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class UpcomingBookingsQueryDto {
  @ApiPropertyOptional({ description: 'ID del complejo' })
  @IsOptional()
  @IsUUID()
  complexId?: string;

  @ApiPropertyOptional({ description: 'Próximos N días', default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  days?: number = 2;
}

export class TrendsQueryDto {
  @ApiPropertyOptional({ description: 'ID del complejo' })
  @IsOptional()
  @IsUUID()
  complexId?: string;

  @ApiProperty({
    description: 'Período para tendencias',
    enum: ['week', 'month', 'quarter', 'year'],
    example: 'month',
  })
  @IsIn(['week', 'month', 'quarter', 'year'])
  period: string;

  @ApiPropertyOptional({
    description: 'Comparar con período',
    enum: ['previous_period', 'last_year'],
    example: 'previous_period',
  })
  @IsOptional()
  @IsIn(['previous_period', 'last_year'])
  compareWith?: string;
}

export class RevenueReportQueryDto {
  @ApiPropertyOptional({ description: 'ID del complejo' })
  @IsOptional()
  @IsUUID()
  complexId?: string;

  @ApiProperty({ description: 'Fecha inicio (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Fecha fin (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Agrupar por',
    enum: ['day', 'week', 'month', 'court', 'client'],
    example: 'day',
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'court', 'client'])
  groupBy?: string;
}
