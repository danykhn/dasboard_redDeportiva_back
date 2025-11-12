import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplexDto, UpdateComplexDto } from './dto/complex.dto';

@Injectable()
export class ComplexesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createComplexDto: CreateComplexDto) {
    const complex = await this.prisma.complex.create({
      data: {
        ...createComplexDto,
        userId,
      },
      include: {
        courts: true,
      },
    });

    return complex;
  }

  async findAll(userId?: string) {
    const where = userId ? { userId } : {};

    return this.prisma.complex.findMany({
      where,
      include: {
        courts: {
          where: { isActive: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId?: string) {
    const complex = await this.prisma.complex.findUnique({
      where: { id },
      include: {
        courts: {
          orderBy: { createdAt: 'desc' },
        },
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

    if (!complex) {
      throw new NotFoundException(`Complejo con ID ${id} no encontrado`);
    }

    // Si se proporciona userId, verificar que sea el dueño
    if (userId && complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este complejo');
    }

    return complex;
  }

  async findByUser(userId: string) {
    return this.prisma.complex.findMany({
      where: { userId },
      include: {
        courts: {
          where: { isActive: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, userId: string, updateComplexDto: UpdateComplexDto) {
    // Verificar que el complejo existe y pertenece al usuario
    const complex = await this.prisma.complex.findUnique({
      where: { id },
    });

    if (!complex) {
      throw new NotFoundException(`Complejo con ID ${id} no encontrado`);
    }

    if (complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar este complejo');
    }

    const updatedComplex = await this.prisma.complex.update({
      where: { id },
      data: updateComplexDto,
      include: {
        courts: true,
      },
    });

    return updatedComplex;
  }

  async remove(id: string, userId: string) {
    // Verificar que el complejo existe y pertenece al usuario
    const complex = await this.prisma.complex.findUnique({
      where: { id },
    });

    if (!complex) {
      throw new NotFoundException(`Complejo con ID ${id} no encontrado`);
    }

    if (complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este complejo');
    }

    await this.prisma.complex.delete({
      where: { id },
    });

    return { message: 'Complejo eliminado exitosamente' };
  }

  async getComplexStats(id: string, userId: string) {
    const complex = await this.findOne(id, userId);

    return {
      id: complex.id,
      name: complex.name,
      totalCourts: complex.courts.length,
      activeCourts: complex.courts.filter((c) => c.isActive).length,
      inactiveCourts: complex.courts.filter((c) => !c.isActive).length,
    };
  }

  async getSelector(userId: string) {
    const complexes = await this.prisma.complex.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return complexes;
  }
}
