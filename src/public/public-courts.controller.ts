import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CourtAvailabilityService } from '../courts/court-availability.service';

@ApiTags('API Pública - Disponibilidad')
@Controller('public/courts')
export class PublicCourtsController {
  constructor(
    private prisma: PrismaService,
    private availabilityService: CourtAvailabilityService,
  ) {}

  @Get(':courtId/availability')
  @ApiOperation({
    summary: 'Verificar disponibilidad de cancha (SIN AUTENTICACIÓN)',
    description: `
      Endpoint público para verificar disponibilidad de canchas.
      Ideal para apps móviles (React Native), sitios web públicos, widgets, etc.
      
      NO REQUIERE autenticación JWT.
      
      Verifica:
      - Bloqueos por mantenimiento, eventos privados, clima, etc.
      - Conflictos con otras reservas (opcional)
      
      Casos de uso:
      - App móvil de clientes que quieren ver disponibilidad antes de llamar
      - Widget de disponibilidad en sitio web del complejo
      - Sistema de pre-reserva online
    `,
  })
  @ApiParam({
    name: 'courtId',
    description: 'ID de la cancha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'date',
    description: 'Fecha de la consulta (YYYY-MM-DD)',
    example: '2024-11-20',
  })
  @ApiQuery({
    name: 'startTime',
    description: 'Hora de inicio (HH:mm)',
    example: '14:00',
  })
  @ApiQuery({
    name: 'endTime',
    description: 'Hora de fin (HH:mm)',
    example: '16:00',
  })
  @ApiQuery({
    name: 'checkBookings',
    required: false,
    description: 'Verificar también conflictos con reservas existentes (true/false)',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de disponibilidad',
    schema: {
      example: {
        available: true,
        message: 'Cancha disponible',
        court: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Cancha 1 - Fútbol',
          complex: {
            name: 'Complejo El Campeon',
            address: 'Av. Principal 123',
            phone: '+5491123456789',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Cancha no encontrada',
  })
  async checkAvailability(
    @Param('courtId') courtId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('checkBookings') checkBookings?: string,
  ) {
    // Verificar que la cancha existe y está activa
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: {
        complex: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${courtId} no encontrada`);
    }

    if (!court.isActive) {
      return {
        available: false,
        message: 'Esta cancha no está disponible actualmente',
        court: {
          id: court.id,
          name: court.name,
          complex: court.complex,
        },
      };
    }

    // Verificar bloqueos de disponibilidad
    const availabilityCheck = await this.availabilityService.checkAvailability({
      courtId,
      date,
      startTime,
      endTime,
    });

    if (!availabilityCheck.available) {
      return {
        ...availabilityCheck,
        court: {
          id: court.id,
          name: court.name,
          complex: court.complex,
        },
      };
    }

    // Si se solicita, verificar también conflictos con reservas
    if (checkBookings === 'true') {
      const bookingDate = new Date(date);
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startDateTime = new Date(bookingDate);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(bookingDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const conflictingBookings = await this.prisma.booking.count({
        where: {
          courtId,
          status: {
            in: ['pending', 'confirmed'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startDateTime } },
                { endTime: { gt: startDateTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endDateTime } },
                { endTime: { gte: endDateTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startDateTime } },
                { endTime: { lte: endDateTime } },
              ],
            },
          ],
        },
      });

      if (conflictingBookings > 0) {
        return {
          available: false,
          message: 'Ya hay una reserva en este horario',
          court: {
            id: court.id,
            name: court.name,
            complex: court.complex,
          },
        };
      }
    }

    return {
      available: true,
      message: 'Cancha disponible',
      court: {
        id: court.id,
        name: court.name,
        complex: court.complex,
      },
    };
  }

  @Get(':courtId/available-slots')
  @ApiOperation({
    summary: 'Obtener slots disponibles de una cancha (SIN AUTENTICACIÓN)',
    description: `
      Retorna todos los slots de 30 minutos disponibles para una cancha en una fecha específica.
      Horario: 6:00 AM - 11:00 PM (slots de 30 minutos)
      
      NO REQUIERE autenticación JWT.
      
      Ideal para:
      - Mostrar calendario de disponibilidad en app móvil
      - Widget de horarios disponibles en sitio web
      - Selección de horario en formulario de reserva online
    `,
  })
  @ApiParam({
    name: 'courtId',
    description: 'ID de la cancha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'date',
    description: 'Fecha de consulta (YYYY-MM-DD)',
    example: '2024-11-20',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de slots disponibles',
    schema: {
      example: {
        date: '2024-11-20',
        court: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Cancha 1 - Fútbol',
        },
        slots: [
          {
            startTime: '06:00',
            endTime: '06:30',
            available: true,
          },
          {
            startTime: '06:30',
            endTime: '07:00',
            available: true,
          },
          {
            startTime: '14:00',
            endTime: '14:30',
            available: false,
            reason: 'Reserva existente',
          },
          {
            startTime: '15:00',
            endTime: '15:30',
            available: false,
            reason: 'Bloqueado: maintenance',
          },
        ],
      },
    },
  })
  async getAvailableSlots(
    @Param('courtId') courtId: string,
    @Query('date') dateStr: string,
  ) {
    // Verificar que la cancha existe
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${courtId} no encontrada`);
    }

    const date = new Date(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Obtener todas las reservas del día
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
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    // Obtener bloqueos del día
    const blocks = await this.prisma.courtAvailability.findMany({
      where: {
        courtId,
        isActive: true,
        startDate: {
          lte: startOfDay,
        },
        endDate: {
          gte: startOfDay,
        },
      },
    });

    // Generar slots de 30 minutos desde las 6:00 hasta las 23:00
    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      reason?: string;
    }> = [];

    for (let hour = 6; hour < 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endMinute = minute + 30;
        const endHour = endMinute >= 60 ? hour + 1 : hour;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;

        let available = true;
        let reason: string | undefined;

        // Verificar bloqueos
        for (const block of blocks) {
          if (!block.startTime || !block.endTime) {
            // Bloqueo de todo el día
            available = false;
            reason = `Bloqueado: ${block.reason}`;
            break;
          }

          const [blockStartHour, blockStartMin] = block.startTime.split(':').map(Number);
          const [blockEndHour, blockEndMin] = block.endTime.split(':').map(Number);
          const blockStartMinutes = blockStartHour * 60 + blockStartMin;
          const blockEndMinutes = blockEndHour * 60 + blockEndMin;
          const slotStartMinutes = hour * 60 + minute;
          const slotEndMinutes = slotStartMinutes + 30;

          const hasOverlap =
            (slotStartMinutes >= blockStartMinutes && slotStartMinutes < blockEndMinutes) ||
            (slotEndMinutes > blockStartMinutes && slotEndMinutes <= blockEndMinutes) ||
            (slotStartMinutes <= blockStartMinutes && slotEndMinutes >= blockEndMinutes);

          if (hasOverlap) {
            available = false;
            reason = `Bloqueado: ${block.reason}`;
            break;
          }
        }

        // Verificar reservas si no está bloqueado
        if (available) {
          for (const booking of bookings) {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);

            if (
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
              (slotStart <= bookingStart && slotEnd >= bookingEnd)
            ) {
              available = false;
              reason = 'Reserva existente';
              break;
            }
          }
        }

        slots.push({
          startTime,
          endTime,
          available,
          ...(reason && { reason }),
        });
      }
    }

    return {
      date: dateStr,
      court: {
        id: court.id,
        name: court.name,
      },
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => s.available).length,
      slots,
    };
  }

  @Get(':courtId/info')
  @ApiOperation({
    summary: 'Obtener información de cancha (SIN AUTENTICACIÓN)',
    description: `
      Retorna información básica de una cancha para mostrar en apps públicas.
      
      NO REQUIERE autenticación JWT.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la cancha',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Cancha 1 - Fútbol',
        description: 'Cancha de fútbol 11 con césped sintético',
        picture: 'https://example.com/court1.jpg',
        isActive: true,
        complex: {
          name: 'Complejo El Campeon',
          address: 'Av. Principal 123',
          phone: '+5491123456789',
        },
      },
    },
  })
  async getCourtInfo(@Param('courtId') courtId: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: {
        complex: {
          select: {
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${courtId} no encontrada`);
    }

    return {
      id: court.id,
      name: court.name,
      description: court.description,
      picture: court.picture,
      isActive: court.isActive,
      complex: court.complex,
    };
  }
}
