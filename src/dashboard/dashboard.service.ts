import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardStatsQueryDto,
  RecentActivityQueryDto,
  UpcomingBookingsQueryDto,
  TrendsQueryDto,
  RevenueReportQueryDto,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, query: DashboardStatsQueryDto) {
    const { startDate, endDate, period } = this.calculateDateRange(query);

    // Verificar acceso al complejo si se especifica
    if (query.complexId) {
      await this.verifyComplexAccess(userId, query.complexId);
    }

    // Obtener IDs de complejos del usuario
    const complexIds = query.complexId
      ? [query.complexId]
      : await this.getUserComplexIds(userId);

    if (complexIds.length === 0) {
      return this.getEmptyStats(query.complexId, startDate, endDate, period);
    }

    // Obtener información del complejo si se especifica uno
    const complexInfo = query.complexId
      ? await this.prisma.complex.findUnique({
          where: { id: query.complexId },
          select: { id: true, name: true },
        })
      : null;

    // Obtener todas las reservas del período
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        ...(query.complexId && {
          court: { complexId: query.complexId },
        }),
        bookingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            complexId: true,
            complex: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Calcular overview
    const overview = this.calculateOverview(bookings, startDate, endDate, complexIds);

    // Revenue por día
    const revenueByDay = this.calculateRevenueByDay(bookings, startDate, endDate);

    // Bookings por status
    const bookingsByStatus = this.calculateBookingsByStatus(bookings);

    // Bookings por payment status
    const bookingsByPaymentStatus = this.calculateBookingsByPaymentStatus(bookings);

    // Top clientes
    const topClients = await this.calculateTopClients(bookings, userId, query.complexId);

    // Utilización de canchas
    const courtUtilization = await this.calculateCourtUtilization(
      userId,
      complexIds,
      startDate,
      endDate,
    );

    return {
      complexId: query.complexId || null,
      complexName: complexInfo?.name || null,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: this.getPeriodLabel(startDate, endDate, period),
      },
      overview,
      revenueByDay,
      bookingsByStatus,
      bookingsByPaymentStatus,
      topClients,
      courtUtilization,
    };
  }

  async getRecentActivity(userId: string, query: RecentActivityQueryDto) {
    const { complexId, limit = 10, offset = 0 } = query;

    if (complexId) {
      await this.verifyComplexAccess(userId, complexId);
    }

    const where: any = { userId };
    if (complexId) {
      where.court = { complexId };
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          court: {
            select: {
              id: true,
              name: true,
              complex: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.booking.count({ where }),
    ]);

    const activities = bookings.map((booking) => ({
      id: booking.id,
      type: this.getActivityType(booking),
      timestamp: booking.updatedAt,
      description: this.getActivityDescription(booking),
      booking: {
        id: booking.id,
        courtName: booking.court.name,
        complexName: booking.court.complex.name,
        clientName: booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : 'Sin cliente',
        date: booking.bookingDate.toISOString().split('T')[0],
        startTime: new Date(booking.startTime).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        endTime: new Date(booking.endTime).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        price: booking.price,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
    }));

    return {
      activities,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getUpcomingBookings(userId: string, query: UpcomingBookingsQueryDto) {
    const { complexId, days = 2 } = query;

    if (complexId) {
      await this.verifyComplexAccess(userId, complexId);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const where: any = {
      userId,
      bookingDate: {
        gte: today,
        lt: futureDate,
      },
      status: {
        in: ['pending', 'confirmed'],
      },
    };

    if (complexId) {
      where.court = { complexId };
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        court: {
          select: {
            id: true,
            name: true,
            complex: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });

    const todayBookings = bookings
      .filter((b) => b.bookingDate >= today && b.bookingDate < tomorrow)
      .map((b) => this.formatUpcomingBooking(b, now));

    const tomorrowBookings = bookings
      .filter((b) => b.bookingDate >= tomorrow && b.bookingDate < futureDate)
      .map((b) => this.formatUpcomingBooking(b, now));

    return {
      today: todayBookings,
      tomorrow: tomorrowBookings,
      summary: {
        todayCount: todayBookings.length,
        tomorrowCount: tomorrowBookings.length,
        todayRevenue: todayBookings.reduce((sum, b) => sum + b.price, 0),
        tomorrowRevenue: tomorrowBookings.reduce((sum, b) => sum + b.price, 0),
      },
    };
  }

  async getTrends(userId: string, query: TrendsQueryDto) {
    const { complexId, period, compareWith } = query;

    if (complexId) {
      await this.verifyComplexAccess(userId, complexId);
    }

    const complexIds = complexId ? [complexId] : await this.getUserComplexIds(userId);

    // Calcular rangos de fechas
    const { current, previous } = this.calculateComparisonRanges(period, compareWith);

    // Obtener bookings de ambos períodos
    const [currentBookings, previousBookings] = await Promise.all([
      this.getBookingsInRange(userId, complexIds, current.start, current.end),
      this.getBookingsInRange(userId, complexIds, previous.start, previous.end),
    ]);

    // Calcular métricas
    const currentMetrics = this.calculatePeriodMetrics(
      currentBookings,
      current.start,
      current.end,
      complexIds,
    );
    const previousMetrics = this.calculatePeriodMetrics(
      previousBookings,
      previous.start,
      previous.end,
      complexIds,
    );

    // Calcular comparaciones
    const comparison = this.calculateComparison(currentMetrics, previousMetrics);

    // Peak days y hours
    const peakDays = this.calculatePeakDays(currentBookings);
    const peakHours = this.calculatePeakHours(currentBookings);

    return {
      period,
      current: {
        startDate: current.start.toISOString().split('T')[0],
        endDate: current.end.toISOString().split('T')[0],
        ...currentMetrics,
      },
      previous: {
        startDate: previous.start.toISOString().split('T')[0],
        endDate: previous.end.toISOString().split('T')[0],
        ...previousMetrics,
      },
      comparison,
      peakDays,
      peakHours,
    };
  }

  async getRevenueReport(userId: string, query: RevenueReportQueryDto) {
    const { complexId, startDate, endDate, groupBy = 'day' } = query;

    if (complexId) {
      await this.verifyComplexAccess(userId, complexId);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const where: any = {
      userId,
      bookingDate: {
        gte: start,
        lte: end,
      },
    };

    if (complexId) {
      where.court = { complexId };
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const summary = {
      totalRevenue: bookings.reduce((sum, b) => sum + b.price, 0),
      paidRevenue: bookings
        .filter((b) => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + b.price, 0),
      pendingRevenue: bookings
        .filter((b) => b.paymentStatus === 'pending')
        .reduce((sum, b) => sum + b.price, 0),
      totalBookings: bookings.length,
      avgBookingValue: bookings.length > 0
        ? bookings.reduce((sum, b) => sum + b.price, 0) / bookings.length
        : 0,
    };

    const breakdown = this.groupRevenueData(bookings, groupBy);
    const byPaymentMethod = this.calculateByPaymentMethod(bookings);

    return {
      period: {
        startDate: startDate,
        endDate: endDate,
      },
      summary,
      breakdown,
      byPaymentMethod,
    };
  }

  // Helper methods

  private calculateDateRange(query: DashboardStatsQueryDto) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let period = query.period || 'month';

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
      period = 'custom';
    } else {
      switch (query.period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          endDate = new Date(now);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
      }
    }

    return { startDate, endDate, period };
  }

  private async verifyComplexAccess(userId: string, complexId: string) {
    const complex = await this.prisma.complex.findFirst({
      where: { id: complexId, userId },
    });

    if (!complex) {
      throw new Error('Complejo no encontrado o sin acceso');
    }
  }

  private async getUserComplexIds(userId: string): Promise<string[]> {
    const complexes = await this.prisma.complex.findMany({
      where: { userId },
      select: { id: true },
    });
    return complexes.map((c) => c.id);
  }

  private calculateOverview(bookings: any[], startDate: Date, endDate: Date, complexIds: string[]) {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
    const completedBookings = bookings.filter((b) => b.status === 'completed').length;

    const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);
    const paidRevenue = bookings
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.price, 0);
    const pendingRevenue = bookings
      .filter((b) => b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + b.price, 0);

    // Calcular tasa de ocupación (simplificado)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPossibleSlots = complexIds.length * 8 * 17 * days; // 8 canchas promedio, 17 slots/día
    const occupancyRate = totalPossibleSlots > 0
      ? (bookings.length / totalPossibleSlots) * 100
      : 0;

    const uniqueClients = new Set(bookings.map((b) => b.client.id)).size;

    return {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      completedBookings,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      activeClients: uniqueClients,
      newClientsThisMonth: 0, // Requiere tracking adicional
    };
  }

  private calculateRevenueByDay(bookings: any[], startDate: Date, endDate: Date) {
    const dayMap = new Map<string, any>();

    // Inicializar todos los días
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dayMap.set(dateKey, {
        date: dateKey,
        total: 0,
        paid: 0,
        pending: 0,
        bookingsCount: 0,
      });
      current.setDate(current.getDate() + 1);
    }

    // Agregar datos de bookings
    bookings.forEach((booking) => {
      const dateKey = booking.bookingDate.toISOString().split('T')[0];
      const dayData = dayMap.get(dateKey);
      if (dayData) {
        dayData.total += booking.price;
        dayData.bookingsCount += 1;
        if (booking.paymentStatus === 'paid') {
          dayData.paid += booking.price;
        } else if (booking.paymentStatus === 'pending') {
          dayData.pending += booking.price;
        }
      }
    });

    return Array.from(dayMap.values());
  }

  private calculateBookingsByStatus(bookings: any[]) {
    const total = bookings.length;
    const counts = {
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
    };

    return {
      pending: {
        count: counts.pending,
        percentage: total > 0 ? Math.round((counts.pending / total) * 1000) / 10 : 0,
      },
      confirmed: {
        count: counts.confirmed,
        percentage: total > 0 ? Math.round((counts.confirmed / total) * 1000) / 10 : 0,
      },
      cancelled: {
        count: counts.cancelled,
        percentage: total > 0 ? Math.round((counts.cancelled / total) * 1000) / 10 : 0,
      },
      completed: {
        count: counts.completed,
        percentage: total > 0 ? Math.round((counts.completed / total) * 1000) / 10 : 0,
      },
    };
  }

  private calculateBookingsByPaymentStatus(bookings: any[]) {
    return {
      pending: {
        count: bookings.filter((b) => b.paymentStatus === 'pending').length,
        revenue: bookings
          .filter((b) => b.paymentStatus === 'pending')
          .reduce((sum, b) => sum + b.price, 0),
      },
      paid: {
        count: bookings.filter((b) => b.paymentStatus === 'paid').length,
        revenue: bookings
          .filter((b) => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + b.price, 0),
      },
      refunded: {
        count: bookings.filter((b) => b.paymentStatus === 'refunded').length,
        revenue: 0,
      },
    };
  }

  private async calculateTopClients(bookings: any[], userId: string, complexId?: string) {
    const clientStats = new Map<string, any>();

    bookings.forEach((booking) => {
      const clientId = booking.client.id;
      if (!clientStats.has(clientId)) {
        clientStats.set(clientId, {
          id: clientId,
          firstName: booking.client.firstName,
          lastName: booking.client.lastName,
          totalBookings: 0,
          totalSpent: 0,
          lastBooking: booking.bookingDate,
        });
      }

      const stats = clientStats.get(clientId);
      stats.totalBookings += 1;
      stats.totalSpent += booking.price;
      if (booking.bookingDate > stats.lastBooking) {
        stats.lastBooking = booking.bookingDate;
      }
    });

    return Array.from(clientStats.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }

  private async calculateCourtUtilization(
    userId: string,
    complexIds: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const courts = await this.prisma.court.findMany({
      where: { complexId: { in: complexIds } },
      include: {
        bookings: {
          where: {
            bookingDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    return courts.map((court) => {
      const totalRevenue = court.bookings.reduce((sum, b) => sum + b.price, 0);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalSlots = 17 * days; // 17 slots por día
      const occupancyRate = totalSlots > 0 ? (court.bookings.length / totalSlots) * 100 : 0;

      // Calcular peak hours
      const hourCounts = new Map<string, number>();
      court.bookings.forEach((b) => {
        const hour = new Date(b.startTime).getHours();
        const hourKey = `${String(hour).padStart(2, '0')}:00`;
        hourCounts.set(hourKey, (hourCounts.get(hourKey) || 0) + 1);
      });

      const peakHours = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((entry) => entry[0]);

      return {
        courtId: court.id,
        courtName: court.name,
        totalBookings: court.bookings.length,
        revenue: totalRevenue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        peakHours,
      };
    });
  }

  private getPeriodLabel(startDate: Date, endDate: Date, period: string): string {
    if (period === 'today') {
      return startDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } else if (period === 'month') {
      return startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } else if (period === 'year') {
      return startDate.getFullYear().toString();
    }
    return `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;
  }

  private getEmptyStats(complexId: string | undefined, startDate: Date, endDate: Date, period: string) {
    return {
      complexId: complexId || null,
      complexName: null,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: this.getPeriodLabel(startDate, endDate, period),
      },
      overview: {
        totalBookings: 0,
        confirmedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        occupancyRate: 0,
        activeClients: 0,
        newClientsThisMonth: 0,
      },
      revenueByDay: [],
      bookingsByStatus: {
        pending: { count: 0, percentage: 0 },
        confirmed: { count: 0, percentage: 0 },
        cancelled: { count: 0, percentage: 0 },
        completed: { count: 0, percentage: 0 },
      },
      bookingsByPaymentStatus: {
        pending: { count: 0, revenue: 0 },
        paid: { count: 0, revenue: 0 },
        refunded: { count: 0, revenue: 0 },
      },
      topClients: [],
      courtUtilization: [],
    };
  }

  private getActivityType(booking: any): string {
    if (booking.status === 'cancelled') return 'booking_cancelled';
    if (booking.paymentStatus === 'paid') return 'payment_received';
    return 'booking_created';
  }

  private getActivityDescription(booking: any): string {
    if (booking.status === 'cancelled') return 'Reserva cancelada';
    if (booking.paymentStatus === 'paid') return 'Pago recibido';
    return 'Nueva reserva creada';
  }

  private formatUpcomingBooking(booking: any, now: Date) {
    const startTime = new Date(booking.startTime);
    const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
    const isCurrentlyActive = now >= startTime && now <= new Date(booking.endTime);

    return {
      id: booking.id,
      courtId: booking.court.id,
      courtName: booking.court.name,
      complexName: booking.court.complex.name,
      client: {
        id: booking.client.id,
        firstName: booking.client.firstName,
        lastName: booking.client.lastName,
        phone: booking.client.phone,
      },
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationMinutes: booking.duration,
      price: booking.price,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      isCurrentlyActive,
      minutesUntilStart: minutesUntilStart > 0 ? minutesUntilStart : 0,
    };
  }

  private calculateComparisonRanges(period: string, compareWith?: string) {
    const now = new Date();
    let currentStart: Date, currentEnd: Date;
    let previousStart: Date, previousEnd: Date;

    switch (period) {
      case 'week':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 7);
        
        if (compareWith === 'last_year') {
          previousEnd = new Date(currentEnd);
          previousEnd.setFullYear(previousEnd.getFullYear() - 1);
          previousStart = new Date(currentStart);
          previousStart.setFullYear(previousStart.getFullYear() - 1);
        } else {
          previousEnd = new Date(currentStart);
          previousStart = new Date(currentStart);
          previousStart.setDate(previousStart.getDate() - 7);
        }
        break;

      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        
        if (compareWith === 'last_year') {
          previousStart = new Date(currentStart);
          previousStart.setFullYear(previousStart.getFullYear() - 1);
          previousEnd = new Date(currentEnd);
          previousEnd.setFullYear(previousEnd.getFullYear() - 1);
        } else {
          previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
          previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        }
        break;

      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;

      case 'month':
      default:
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        if (compareWith === 'last_year') {
          previousStart = new Date(currentStart);
          previousStart.setFullYear(previousStart.getFullYear() - 1);
          previousEnd = new Date(currentEnd);
          previousEnd.setFullYear(previousEnd.getFullYear() - 1);
        } else {
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        }
        break;
    }

    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    };
  }

  private async getBookingsInRange(
    userId: string,
    complexIds: string[],
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.booking.findMany({
      where: {
        userId,
        court: {
          complexId: { in: complexIds },
        },
        bookingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  private calculatePeriodMetrics(
    bookings: any[],
    startDate: Date,
    endDate: Date,
    complexIds: string[],
  ) {
    const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);
    const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalSlots = complexIds.length * 8 * 17 * days;
    const occupancyRate = totalSlots > 0 ? (bookings.length / totalSlots) * 100 : 0;

    return {
      bookings: bookings.length,
      revenue: totalRevenue,
      avgBookingValue: Math.round(avgBookingValue * 100) / 100,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
    };
  }

  private calculateComparison(current: any, previous: any) {
    const bookingsChange = previous.bookings > 0
      ? ((current.bookings - previous.bookings) / previous.bookings) * 100
      : 0;
    
    const revenueChange = previous.revenue > 0
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100
      : 0;

    const occupancyChange = current.occupancyRate - previous.occupancyRate;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (revenueChange > 5) trend = 'up';
    else if (revenueChange < -5) trend = 'down';

    return {
      bookingsChange: Math.round(bookingsChange * 10) / 10,
      bookingsChangeAbs: current.bookings - previous.bookings,
      revenueChange: Math.round(revenueChange * 10) / 10,
      revenueChangeAbs: current.revenue - previous.revenue,
      occupancyChange: Math.round(occupancyChange * 10) / 10,
      trend,
    };
  }

  private calculatePeakDays(bookings: any[]) {
    const dayMap = new Map<string, any>();

    bookings.forEach((booking) => {
      const dateKey = booking.bookingDate.toISOString().split('T')[0];
      if (!dayMap.has(dateKey)) {
        const date = new Date(booking.bookingDate);
        dayMap.set(dateKey, {
          date: dateKey,
          dayOfWeek: date.toLocaleDateString('es-ES', { weekday: 'long' }),
          bookings: 0,
          revenue: 0,
        });
      }
      const dayData = dayMap.get(dateKey);
      dayData.bookings += 1;
      dayData.revenue += booking.price;
    });

    return Array.from(dayMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private calculatePeakHours(bookings: any[]) {
    const hourMap = new Map<string, any>();

    bookings.forEach((booking) => {
      const hour = new Date(booking.startTime).getHours();
      const hourKey = `${String(hour).padStart(2, '0')}:00`;
      
      if (!hourMap.has(hourKey)) {
        hourMap.set(hourKey, {
          hour: hourKey,
          bookings: 0,
          revenue: 0,
        });
      }
      
      const hourData = hourMap.get(hourKey);
      hourData.bookings += 1;
      hourData.revenue += booking.price;
    });

    return Array.from(hourMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private groupRevenueData(bookings: any[], groupBy: string) {
    const grouped: any[] = [];

    if (groupBy === 'day') {
      const dayMap = new Map<string, any>();
      bookings.forEach((b) => {
        const dateKey = b.bookingDate.toISOString().split('T')[0];
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date: dateKey, revenue: 0, bookings: 0 });
        }
        const data = dayMap.get(dateKey);
        data.revenue += b.price;
        data.bookings += 1;
      });
      return Array.from(dayMap.values());
    }

    // Implementar otros groupBy según necesidad
    return grouped;
  }

  private calculateByPaymentMethod(bookings: any[]) {
    const methods = ['cash', 'card', 'transfer', 'other', 'pending'];
    const result: any = {};

    methods.forEach((method) => {
      result[method] = bookings
        .filter((b) => (b.paymentMethod === method) || (method === 'pending' && b.paymentStatus === 'pending'))
        .reduce((sum, b) => sum + b.price, 0);
    });

    return result;
  }
}
