import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, ...rest } = createUserDto;

    // Verificar si el email ya existe
    const existingUser = await this.prisma.userDashboard.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.userDashboard.create({
      data: {
        email,
        password: hashedPassword,
        ...rest,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.userDashboard.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.userDashboard.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Verifica que existe

    const { password, email, ...rest } = updateUserDto;
    const updateData: any = { ...rest };

    // Si se actualiza el email, verificar que no exista
    if (email) {
      const existingUser = await this.prisma.userDashboard.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('El email ya está en uso');
      }
      updateData.email = email;
    }

    // Si se actualiza la contraseña, hashearla
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.userDashboard.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica que existe

    await this.prisma.userDashboard.delete({
      where: { id },
    });

    return { message: 'Usuario eliminado exitosamente' };
  }
}
