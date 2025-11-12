import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { DashboardService } from './dashboard.service';
import {
  DashboardStatsQueryDto,
  RecentActivityQueryDto,
  UpcomingBookingsQueryDto,
  TrendsQueryDto,
  RevenueReportQueryDto,
} from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas generales del dashboard',
    description: `
      Retorna métricas generales incluyendo:
      - Total de reservas por estado
      - Ingresos totales, pagados y pendientes
      - Tasa de ocupación
      - Clientes activos
      - Ingresos por día
      - Top 5 clientes
      - Utilización de canchas con tasa de ocupación
      
      Si se especifica complexId, filtra por ese complejo.
      Si no se especifica, agrega datos de todos los complejos del usuario.
    `,
  })
  async getStats(
    @GetUser('id') userId: string,
    @Query() query: DashboardStatsQueryDto,
  ) {
    return this.dashboardService.getStats(userId, query);
  }

  @Get('recent-activity')
  @ApiOperation({
    summary: 'Obtener actividad reciente',
    description: `
      Retorna las últimas actividades (reservas, pagos, cancelaciones)
      ordenadas por fecha de actualización descendente.
      
      Soporta paginación con limit y offset.
    `,
  })
  async getRecentActivity(
    @GetUser('id') userId: string,
    @Query() query: RecentActivityQueryDto,
  ) {
    return this.dashboardService.getRecentActivity(userId, query);
  }

  @Get('upcoming-bookings')
  @ApiOperation({
    summary: 'Obtener próximas reservas',
    description: `
      Retorna reservas próximas agrupadas por hoy y mañana.
      
      Incluye información de:
      - Si está actualmente en curso
      - Minutos hasta el inicio
      - Datos del cliente y cancha
      - Estado de pago
      
      Por defecto muestra las próximas 48 horas (days=2).
    `,
  })
  async getUpcomingBookings(
    @GetUser('id') userId: string,
    @Query() query: UpcomingBookingsQueryDto,
  ) {
    return this.dashboardService.getUpcomingBookings(userId, query);
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Obtener análisis de tendencias',
    description: `
      Compara métricas del período actual vs período anterior o año anterior.
      
      Retorna:
      - Cambios porcentuales en reservas, ingresos, ocupación
      - Tendencia general (up/down/stable)
      - Top 5 días pico
      - Top 5 horas pico
      
      Períodos soportados: week, month, quarter, year
      Comparación: previous_period (por defecto) o last_year
    `,
  })
  async getTrends(
    @GetUser('id') userId: string,
    @Query() query: TrendsQueryDto,
  ) {
    return this.dashboardService.getTrends(userId, query);
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Reporte de ingresos con agrupación flexible',
    description: `
      Genera reporte de ingresos en un rango de fechas con opciones de agrupación.
      
      Retorna:
      - Resumen general (total, pagado, pendiente, promedio)
      - Breakdown según groupBy (day, week, month, court, client)
      - Distribución por método de pago
      
      Útil para análisis financiero y facturación.
    `,
  })
  async getRevenueReport(
    @GetUser('id') userId: string,
    @Query() query: RevenueReportQueryDto,
  ) {
    return this.dashboardService.getRevenueReport(userId, query);
  }
}
