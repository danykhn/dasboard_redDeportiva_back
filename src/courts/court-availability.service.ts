import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCourtAvailabilityDto,
  UpdateCourtAvailabilityDto,
  CheckAvailabilityDto,
} from './dto/court-availability.dto';

@Injectable()
export class CourtAvailabilityService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateCourtAvailabilityDto) {
    // Verificar que la cancha existe y pertenece al usuario
    const court = await this.prisma.court.findUnique({
      where: { id: createDto.courtId },
      include: { complex: true },
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${createDto.courtId} no encontrada`);
    }

    if (court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para bloquear esta cancha');
    }

    // Validar fechas
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Validar horas si están presentes
    if (createDto.startTime && createDto.endTime) {
      const [startHour, startMin] = createDto.startTime.split(':').map(Number);
      const [endHour, endMin] = createDto.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio');
      }
    }

    // Crear el bloqueo
    const availability = await this.prisma.courtAvailability.create({
      data: {
        courtId: createDto.courtId,
        startDate,
        endDate,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        reason: createDto.reason,
        description: createDto.description,
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
              },
            },
          },
        },
      },
    });

    return availability;
  }

  async findAll(userId: string, courtId?: string, isActive?: boolean) {
    const where: any = {
      court: {
        complex: {
          userId,
        },
      },
    };

    if (courtId) {
      where.courtId = courtId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.courtAvailability.findMany({
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
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const availability = await this.prisma.courtAvailability.findUnique({
      where: { id },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            complex: {
              select: {
                id: true,
                name: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!availability) {
      throw new NotFoundException(`Bloqueo con ID ${id} no encontrado`);
    }

    if (availability.court.complex.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este bloqueo');
    }

    return availability;
  }

  async update(id: string, userId: string, updateDto: UpdateCourtAvailabilityDto) {
    // Verificar existencia y permisos
    await this.findOne(id, userId);

    // Validar fechas si están presentes
    if (updateDto.startDate && updateDto.endDate) {
      const startDate = new Date(updateDto.startDate);
      const endDate = new Date(updateDto.endDate);

      if (endDate < startDate) {
        throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    }

    // Validar horas si están presentes
    if (updateDto.startTime && updateDto.endTime) {
      const [startHour, startMin] = updateDto.startTime.split(':').map(Number);
      const [endHour, endMin] = updateDto.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio');
      }
    }

    const data: any = {};

    if (updateDto.startDate) data.startDate = new Date(updateDto.startDate);
    if (updateDto.endDate) data.endDate = new Date(updateDto.endDate);
    if (updateDto.startTime !== undefined) data.startTime = updateDto.startTime;
    if (updateDto.endTime !== undefined) data.endTime = updateDto.endTime;
    if (updateDto.reason) data.reason = updateDto.reason;
    if (updateDto.description !== undefined) data.description = updateDto.description;

    const updated = await this.prisma.courtAvailability.update({
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
      },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    // Verificar existencia y permisos
    await this.findOne(id, userId);

    await this.prisma.courtAvailability.delete({
      where: { id },
    });

    return { message: 'Bloqueo eliminado exitosamente' };
  }

  async toggleActive(id: string, userId: string) {
    const availability = await this.findOne(id, userId);

    const updated = await this.prisma.courtAvailability.update({
      where: { id },
      data: {
        isActive: !availability.isActive,
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
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Verifica si una cancha está bloqueada en una fecha/hora específica
   */
  async checkAvailability(checkDto: CheckAvailabilityDto) {
    const { courtId, date, startTime, endTime } = checkDto;

    const bookingDate = new Date(date);

    // Buscar bloqueos activos que afecten esta fecha
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
      return {
        available: true,
        message: 'Cancha disponible',
      };
    }

    // Verificar si algún bloqueo afecta el horario solicitado
    const [reqStartHour, reqStartMin] = startTime.split(':').map(Number);
    const [reqEndHour, reqEndMin] = endTime.split(':').map(Number);
    const reqStartMinutes = reqStartHour * 60 + reqStartMin;
    const reqEndMinutes = reqEndHour * 60 + reqEndMin;

    for (const block of blocks) {
      // Si el bloqueo es de todo el día (sin horas específicas)
      if (!block.startTime || !block.endTime) {
        return {
          available: false,
          message: `Cancha bloqueada: ${block.reason}`,
          reason: block.reason,
          description: block.description,
          blockId: block.id,
        };
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
        return {
          available: false,
          message: `Cancha bloqueada de ${block.startTime} a ${block.endTime}: ${block.reason}`,
          reason: block.reason,
          description: block.description,
          blockId: block.id,
          blockedFrom: block.startTime,
          blockedTo: block.endTime,
        };
      }
    }

    return {
      available: true,
      message: 'Cancha disponible',
    };
  }

  /**
   * Obtiene bloqueos activos para una cancha en un rango de fechas
   */
  async getActiveBlocks(courtId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.prisma.courtAvailability.findMany({
      where: {
        courtId,
        isActive: true,
        OR: [
          {
            startDate: {
              gte: start,
              lte: end,
            },
          },
          {
            endDate: {
              gte: start,
              lte: end,
            },
          },
          {
            AND: [
              {
                startDate: {
                  lte: start,
                },
              },
              {
                endDate: {
                  gte: end,
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }
}
