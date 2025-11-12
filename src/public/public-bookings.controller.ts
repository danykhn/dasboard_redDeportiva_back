import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CourtAvailabilityService } from '../courts/court-availability.service';
import {
  QueryPublicBookingsDto,
  CreatePublicBookingDto,
} from '../bookings/dto/public-booking.dto';

@ApiTags('API Pública - Reservas')
@Controller('public/bookings')
export class PublicBookingsController {
  constructor(
    private prisma: PrismaService,
    private availabilityService: CourtAvailabilityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar reservas (SIN AUTENTICACIÓN)',
    description: `
      Endpoint público para consultar reservas con filtros opcionales.
      NO requiere autenticación JWT.
      
      Filtros disponibles:
      - courtId: Filtrar por cancha específica
      - date: Filtrar por fecha (YYYY-MM-DD)
      - startTime: Filtrar por hora de inicio (HH:mm)
      - endTime: Filtrar por hora de fin (HH:mm)
      - status: Filtrar por estado (pending, confirmed, cancelled, completed)
      
      Ideal para:
      - Ver disponibilidad de canchas en tiempo real
      - Mostrar calendario de reservas en app móvil
      - Widget público de ocupación
    `,
  })
  @ApiQuery({
    name: 'courtId',
    required: false,
    description: 'ID de la cancha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Fecha de reserva (YYYY-MM-DD)',
    example: '2024-11-20',
  })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: 'Hora de inicio (HH:mm)',
    example: '14:00',
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: 'Hora de fin (HH:mm)',
    example: '16:00',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Estado de la reserva',
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página de resultados',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            bookingDate: '2024-11-20T00:00:00.000Z',
            startTime: '2024-11-20T14:00:00.000Z',
            endTime: '2024-11-20T16:00:00.000Z',
            duration: 120,
            status: 'confirmed',
            court: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Cancha 1 - Fútbol',
              complex: {
                name: 'Complejo El Campeon',
              },
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    },
  })
  async queryBookings(@Query() query: QueryPublicBookingsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      status: {
        in: ['pending', 'confirmed'], // Solo reservas activas
      },
    };

    if (query.courtId) {
      where.courtId = query.courtId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.date) {
      const date = new Date(query.date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.bookingDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (query.startTime || query.endTime) {
      where.AND = [];

      if (query.startTime && query.date) {
        const [hour, min] = query.startTime.split(':').map(Number);
        const dateTime = new Date(query.date);
        dateTime.setHours(hour, min, 0, 0);

        where.AND.push({
          startTime: {
            gte: dateTime,
          },
        });
      }

      if (query.endTime && query.date) {
        const [hour, min] = query.endTime.split(':').map(Number);
        const dateTime = new Date(query.date);
        dateTime.setHours(hour, min, 0, 0);

        where.AND.push({
          endTime: {
            lte: dateTime,
          },
        });
      }
    }

    // Obtener total de registros
    const total = await this.prisma.booking.count({ where });

    // Obtener reservas paginadas
    const bookings = await this.prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        bookingDate: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        createdAt: true,
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
      },
    });

    return {
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear reserva desde app nativa (SIN AUTENTICACIÓN)',
    description: `
      Endpoint público para crear reservas desde aplicaciones móviles.
      NO requiere autenticación JWT.
      
      Comportamiento según isAppNative:
      
      1. isAppNative = true (Reserva desde app móvil):
         - Requiere userId (del usuario de la app nativa)
         - clientId es opcional (null)
         - Campos adicionales: clientName, clientPhone, clientEmail (opcionales)
         
      2. isAppNative = false (Reserva desde dashboard):
         - Requiere clientId
         - userId debe ser del administrador del dashboard
      
      Validaciones automáticas:
      - Verifica disponibilidad de la cancha
      - Verifica bloqueos por mantenimiento/eventos
      - Previene reservas duplicadas en el mismo horario
      - Valida que la cancha exista y esté activa
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva creada exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        bookingDate: '2024-11-20T00:00:00.000Z',
        startTime: '2024-11-20T14:00:00.000Z',
        endTime: '2024-11-20T16:00:00.000Z',
        duration: 120,
        price: 5000,
        status: 'pending',
        isAppNative: true,
        court: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Cancha 1 - Fútbol',
        },
        message: 'Reserva creada exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o cancha no disponible',
  })
  @ApiResponse({
    status: 404,
    description: 'Cancha no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - Ya existe una reserva en ese horario',
  })
  async createBooking(@Body() dto: CreatePublicBookingDto) {
    // 1. Validar que la cancha existe y está activa
    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: {
        complex: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!court) {
      throw new NotFoundException('Cancha no encontrada');
    }

    if (!court.isActive) {
      throw new BadRequestException('La cancha no está activa');
    }

    // 2. Parsear fecha y horas
    const bookingDate = new Date(dto.date);
    const [startHour, startMin] = dto.startTime.split(':').map(Number);
    const [endHour, endMin] = dto.endTime.split(':').map(Number);

    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    // Calcular duración en minutos
    const duration = Math.floor(
      (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60),
    );

    if (duration <= 0) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio',
      );
    }

    // 3. Verificar disponibilidad (bloqueos)
    const availabilityCheck = await this.availabilityService.checkAvailability({
      courtId: dto.courtId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    if (!availabilityCheck.available) {
      throw new BadRequestException(
        `Cancha no disponible: ${availabilityCheck.message}`,
      );
    }

    // 4. Verificar conflictos con otras reservas
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        courtId: dto.courtId,
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

    if (conflictingBookings.length > 0) {
      throw new BadRequestException(
        'Ya existe una reserva en ese horario',
      );
    }

    // 5. Determinar userId y clientId según isAppNative
    let finalUserId: string;
    let finalClientId: string | null = null;

    if (dto.isAppNative) {
      // Reserva desde app nativa
      if (!dto.userId) {
        throw new BadRequestException(
          'userId es requerido para reservas desde app nativa',
        );
      }
      finalUserId = dto.userId;
      finalClientId = dto.clientId || null;
    } else {
      // Reserva desde dashboard
      if (!dto.clientId) {
        throw new BadRequestException(
          'clientId es requerido para reservas desde dashboard',
        );
      }
      finalUserId = dto.userId || court.complex.userId; // User del complejo
      finalClientId = dto.clientId;
    }

    // 6. Crear la reserva
    const booking = await this.prisma.booking.create({
      data: {
        courtId: dto.courtId,
        ...(finalClientId && { clientId: finalClientId }),
        userId: finalUserId,
        bookingDate,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        price: dto.price,
        status: 'pending',
        paymentMethod: dto.paymentMethod || null,
        paymentStatus: 'pending',
        notes: dto.notes || null,
        isAppNative: dto.isAppNative,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            complex: {
              select: {
                name: true,
                address: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return {
      ...booking,
      message: 'Reserva creada exitosamente',
    };
  }

  @Get('by-court/:courtId')
  @ApiOperation({
    summary: 'Obtener reservas de una cancha específica (SIN AUTENTICACIÓN)',
    description: `
      Retorna todas las reservas confirmadas y pendientes de una cancha.
      NO requiere autenticación JWT.
      
      Útil para:
      - Mostrar calendario de ocupación de una cancha
      - Ver disponibilidad en tiempo real
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas de la cancha',
  })
  async getBookingsByCourt(
    @Query('courtId') courtId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: any = {
      courtId,
      status: {
        in: ['pending', 'confirmed'],
      },
    };

    if (startDate && endDate) {
      where.bookingDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        bookingDate: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
      },
    });

    return bookings;
  }
}
