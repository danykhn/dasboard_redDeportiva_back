import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createClientDto: CreateClientDto) {
    const data: any = {
      ...createClientDto,
      userId,
    };

    // Convertir birthDate a Date si está presente
    if (createClientDto.birthDate) {
      data.birthDate = new Date(createClientDto.birthDate);
    }

    return this.prisma.client.create({
      data,
      include: {
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
  }

  async findAll(userId?: string, search?: string) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.client.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        bookings: {
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
          },
          orderBy: {
            bookingDate: 'desc',
          },
          take: 10, // Últimas 10 reservas
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (client.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este cliente');
    }

    return client;
  }

  async findByUser(userId: string, activeOnly = false) {
    const where: any = { userId };

    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.client.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });
  }

  async update(id: string, userId: string, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (client.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar este cliente');
    }

    const data: any = { ...updateClientDto };

    // Convertir birthDate a Date si está presente
    if (updateClientDto.birthDate) {
      data.birthDate = new Date(updateClientDto.birthDate);
    }

    return this.prisma.client.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (client.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este cliente');
    }

    // Verificar si tiene reservas activas
    const activeBookings = await this.prisma.booking.count({
      where: {
        clientId: id,
        status: {
          in: ['pending', 'confirmed'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new ForbiddenException(
        `No se puede eliminar el cliente. Tiene ${activeBookings} reserva(s) activa(s)`,
      );
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return { message: 'Cliente eliminado exitosamente' };
  }

  async getClientStats(userId: string) {
    const [total, active, inactive, withBookings] = await Promise.all([
      this.prisma.client.count({ where: { userId } }),
      this.prisma.client.count({ where: { userId, isActive: true } }),
      this.prisma.client.count({ where: { userId, isActive: false } }),
      this.prisma.client.count({
        where: {
          userId,
          bookings: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      withBookings,
      withoutBookings: total - withBookings,
    };
  }
}
