import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto, UpdateCourtDto } from './dto/court.dto';

@Injectable()
export class CourtsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createCourtDto: CreateCourtDto) {
    // Verificar que el complejo existe y pertenece al usuario
    const complex = await this.prisma.complex.findUnique({
      where: { id: createCourtDto.complexId },
    });

    if (!complex) {
      throw new NotFoundException('Complejo no encontrado');
    }

    if (complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para agregar canchas a este complejo');
    }

    return this.prisma.court.create({
      data: createCourtDto,
      include: {
        complex: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  async findAll(userId?: string, complexId?: string) {
    const where: any = {};

    if (complexId) {
      // Verificar que el complejo pertenece al usuario si se especifica
      if (userId) {
        const complex = await this.prisma.complex.findFirst({
          where: { id: complexId, userId },
        });
        if (!complex) {
          throw new ForbiddenException('No tienes acceso a este complejo');
        }
      }
      where.complexId = complexId;
    } else if (userId) {
      // Si solo se filtra por usuario, obtener canchas de sus complejos
      where.complex = {
        userId,
      };
    }

    return this.prisma.court.findMany({
      where,
      include: {
        complex: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: {
        complex: true,
      },
    });

    if (!court) {
      throw new NotFoundException('Cancha no encontrada');
    }

    // Verificar que la cancha pertenece a un complejo del usuario
    if (court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta cancha');
    }

    return court;
  }

  async findByComplex(complexId: string, userId: string) {
    // Verificar que el complejo pertenece al usuario
    const complex = await this.prisma.complex.findFirst({
      where: { id: complexId, userId },
    });

    if (!complex) {
      throw new ForbiddenException('No tienes acceso a este complejo');
    }

    return this.prisma.court.findMany({
      where: { complexId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, userId: string, updateCourtDto: UpdateCourtDto) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { complex: true },
    });

    if (!court) {
      throw new NotFoundException('Cancha no encontrada');
    }

    if (court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta cancha');
    }

    // Si se cambia el complexId, verificar que el nuevo complejo también pertenece al usuario
    if (updateCourtDto.complexId && updateCourtDto.complexId !== court.complexId) {
      const newComplex = await this.prisma.complex.findFirst({
        where: { id: updateCourtDto.complexId, userId },
      });

      if (!newComplex) {
        throw new ForbiddenException('El nuevo complejo no existe o no te pertenece');
      }
    }

    return this.prisma.court.update({
      where: { id },
      data: updateCourtDto,
      include: {
        complex: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { complex: true },
    });

    if (!court) {
      throw new NotFoundException('Cancha no encontrada');
    }

    if (court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta cancha');
    }

    await this.prisma.court.delete({
      where: { id },
    });

    return { message: 'Cancha eliminada exitosamente' };
  }

  async getCourtStats(complexId: string, userId: string) {
    // Verificar que el complejo pertenece al usuario
    const complex = await this.prisma.complex.findFirst({
      where: { id: complexId, userId },
    });

    if (!complex) {
      throw new ForbiddenException('No tienes acceso a este complejo');
    }

    const [total, active, inactive] = await Promise.all([
      this.prisma.court.count({ where: { complexId } }),
      this.prisma.court.count({ where: { complexId, isActive: true } }),
      this.prisma.court.count({ where: { complexId, isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
      complexId,
      complexName: complex.name,
    };
  }
}
