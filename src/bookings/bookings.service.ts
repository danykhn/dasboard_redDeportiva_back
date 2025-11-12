import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, UpdateBookingDto, CheckAvailabilityDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBookingDto: CreateBookingDto) {
    // Validar que la cancha existe y pertenece a un complejo del usuario
    const court = await this.prisma.court.findUnique({
      where: { id: createBookingDto.courtId },
      include: { complex: true },
    });

    if (!court) {
      throw new NotFoundException('Cancha no encontrada');
    }

    if (court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para crear reservas en esta cancha');
    }

    // Validar que el cliente existe y pertenece al usuario
    const client = await this.prisma.client.findUnique({
      where: { id: createBookingDto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (client.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para usar este cliente');
    }

    // Validar horarios
    const startTime = new Date(createBookingDto.startTime);
    const endTime = new Date(createBookingDto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio');
    }

    // Validar disponibilidad
    const isAvailable = await this.checkTimeSlotAvailability(
      createBookingDto.courtId,
      startTime,
      endTime,
    );

    if (!isAvailable) {
      throw new ConflictException('La cancha no está disponible en el horario seleccionado');
    }

    // Crear la reserva
    return this.prisma.booking.create({
      data: {
        ...createBookingDto,
        bookingDate: new Date(createBookingDto.bookingDate),
        startTime,
        endTime,
        userId,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            complex: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async findAll(userId?: string, filters?: {
    courtId?: string;
    clientId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (filters?.courtId) {
      where.courtId = filters.courtId;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.bookingDate = {};
      if (filters.dateFrom) {
        where.bookingDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.bookingDate.lte = new Date(filters.dateTo);
      }
    }

    return this.prisma.booking.findMany({
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
      orderBy: [
        { bookingDate: 'desc' },
        { startTime: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: {
          include: {
            complex: true,
          },
        },
        client: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta reserva');
    }

    return booking;
  }

  async update(id: string, userId: string, updateBookingDto: UpdateBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: { include: { complex: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta reserva');
    }

    // Si se actualiza el horario, validar disponibilidad
    if (updateBookingDto.startTime || updateBookingDto.endTime) {
      const startTime = updateBookingDto.startTime
        ? new Date(updateBookingDto.startTime)
        : booking.startTime;
      const endTime = updateBookingDto.endTime
        ? new Date(updateBookingDto.endTime)
        : booking.endTime;

      if (endTime <= startTime) {
        throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio');
      }

      const isAvailable = await this.checkTimeSlotAvailability(
        booking.courtId,
        startTime,
        endTime,
        id, // Excluir la reserva actual
      );

      if (!isAvailable) {
        throw new ConflictException('La cancha no está disponible en el horario seleccionado');
      }
    }

    const data: any = { ...updateBookingDto };

    if (updateBookingDto.bookingDate) {
      data.bookingDate = new Date(updateBookingDto.bookingDate);
    }
    if (updateBookingDto.startTime) {
      data.startTime = new Date(updateBookingDto.startTime);
    }
    if (updateBookingDto.endTime) {
      data.endTime = new Date(updateBookingDto.endTime);
    }

    return this.prisma.booking.update({
      where: { id },
      data,
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
    });
  }

  async remove(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta reserva');
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    return { message: 'Reserva eliminada exitosamente' };
  }

  async cancelBooking(id: string, userId: string) {
    const booking = await this.findOne(id, userId);

    if (booking.status === 'cancelled') {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    if (booking.status === 'completed') {
      throw new BadRequestException('No se puede cancelar una reserva completada');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
        paymentStatus: booking.paymentStatus === 'paid' ? 'refunded' : 'pending',
      },
      include: {
        court: true,
        client: true,
      },
    });
  }

  async checkAvailability(checkAvailabilityDto: CheckAvailabilityDto) {
    const { courtId, date, startTime, endTime } = checkAvailabilityDto;

    // Si se proporcionan startTime y endTime, verificar ese slot específico
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const isAvailable = await this.checkTimeSlotAvailability(courtId, start, end);

      return {
        courtId,
        date,
        startTime: start,
        endTime: end,
        available: isAvailable,
      };
    }

    // Si no, devolver todos los slots del día
    return this.getAvailableSlots(courtId, new Date(date));
  }

  private async checkTimeSlotAvailability(
    courtId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    // 1. Verificar conflictos con otras reservas
    const where: any = {
      courtId,
      status: {
        in: ['pending', 'confirmed'],
      },
      OR: [
        {
          // Nueva reserva comienza durante una reserva existente
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          // Nueva reserva termina durante una reserva existente
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } },
          ],
        },
        {
          // Nueva reserva contiene completamente una reserva existente
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const conflictingBookings = await this.prisma.booking.count({ where });

    if (conflictingBookings > 0) {
      return false;
    }

    // 2. Verificar bloqueos de disponibilidad
    const bookingDate = new Date(startTime);
    bookingDate.setHours(0, 0, 0, 0);

    const blocks = await this.prisma.courtAvailability.findMany({
      where: {
        courtId,
        isActive: true,
        startDate: {
          lte: bookingDate,
        },
        endDate: {
          gte: bookingDate,
        },
      },
    });

    if (blocks.length === 0) {
      return true;
    }

    // Convertir las fechas de la reserva a minutos desde medianoche
    const reqStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const reqEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    for (const block of blocks) {
      // Si el bloqueo es de todo el día (sin horas específicas)
      if (!block.startTime || !block.endTime) {
        return false;
      }

      // Si el bloqueo tiene horas específicas, verificar solapamiento
      const [blockStartHour, blockStartMin] = block.startTime.split(':').map(Number);
      const [blockEndHour, blockEndMin] = block.endTime.split(':').map(Number);
      const blockStartMinutes = blockStartHour * 60 + blockStartMin;
      const blockEndMinutes = blockEndHour * 60 + blockEndMin;

      // Verificar solapamiento de horarios
      const hasOverlap =
        (reqStartMinutes >= blockStartMinutes && reqStartMinutes < blockEndMinutes) ||
        (reqEndMinutes > blockStartMinutes && reqEndMinutes <= blockEndMinutes) ||
        (reqStartMinutes <= blockStartMinutes && reqEndMinutes >= blockEndMinutes);

      if (hasOverlap) {
        return false;
      }
    }

    return true;
  }

  private async getAvailableSlots(courtId: string, date: Date) {
    // Obtener todas las reservas del día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    // Generar slots de 30 minutos desde las 6 AM hasta las 11 PM
    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      bookingId?: string;
    }> = [];
    const dayStart = new Date(date);
    dayStart.setHours(6, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 0, 0, 0);

    let currentTime = new Date(dayStart);

    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      const isBooked = bookings.some(
        (booking) =>
          (currentTime >= booking.startTime && currentTime < booking.endTime) ||
          (slotEnd > booking.startTime && slotEnd <= booking.endTime) ||
          (currentTime <= booking.startTime && slotEnd >= booking.endTime),
      );

      slots.push({
        startTime: currentTime.toISOString(),
        endTime: slotEnd.toISOString(),
        available: !isBooked,
        bookingId: isBooked
          ? bookings.find(
              (b) =>
                (currentTime >= b.startTime && currentTime < b.endTime) ||
                (slotEnd > b.startTime && slotEnd <= b.endTime),
            )?.id
          : undefined,
      });

      currentTime = slotEnd;
    }

    return {
      courtId,
      date: date.toISOString(),
      slots,
    };
  }

  async getBookingStats(userId: string, filters?: { dateFrom?: string; dateTo?: string }) {
    const where: any = { userId };

    if (filters?.dateFrom || filters?.dateTo) {
      where.bookingDate = {};
      if (filters.dateFrom) {
        where.bookingDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.bookingDate.lte = new Date(filters.dateTo);
      }
    }

    const [total, pending, confirmed, cancelled, completed, totalRevenue, paidRevenue] =
      await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.count({ where: { ...where, status: 'pending' } }),
        this.prisma.booking.count({ where: { ...where, status: 'confirmed' } }),
        this.prisma.booking.count({ where: { ...where, status: 'cancelled' } }),
        this.prisma.booking.count({ where: { ...where, status: 'completed' } }),
        this.prisma.booking.aggregate({
          where,
          _sum: { price: true },
        }),
        this.prisma.booking.aggregate({
          where: { ...where, paymentStatus: 'paid' },
          _sum: { price: true },
        }),
      ]);

    return {
      total,
      byStatus: {
        pending,
        confirmed,
        cancelled,
        completed,
      },
      revenue: {
        total: totalRevenue._sum.price || 0,
        paid: paidRevenue._sum.price || 0,
        pending: (totalRevenue._sum.price || 0) - (paidRevenue._sum.price || 0),
      },
    };
  }

  async getCourtBookings(courtId: string, userId: string, date?: string) {
    // Verificar que la cancha pertenece a un complejo del usuario
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: { complex: true },
    });

    if (!court) {
      throw new NotFoundException('Cancha no encontrada');
    }

    if (court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver las reservas de esta cancha');
    }

    const where: any = { courtId };

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.bookingDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { bookingDate: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }
}
