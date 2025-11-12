import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Clientes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@GetUser('id') userId: string, @Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(userId, createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiQuery({ name: 'myClients', required: false, type: Boolean, description: 'Solo mis clientes' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombre, email, teléfono o documento' })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  findAll(
    @GetUser('id') userId: string,
    @Query('myClients') myClients?: string,
    @Query('search') search?: string,
  ) {
    const filterByUser = myClients === 'true';
    return this.clientsService.findAll(filterByUser ? userId : undefined, search);
  }

  @Get('my-clients')
  @ApiOperation({ summary: 'Obtener mis clientes' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Solo clientes activos' })
  @ApiResponse({ status: 200, description: 'Lista de mis clientes' })
  findMyClients(
    @GetUser('id') userId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.clientsService.findByUser(userId, activeOnly === 'true');
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de clientes' })
  @ApiResponse({ status: 200, description: 'Estadísticas de clientes' })
  getStats(@GetUser('id') userId: string) {
    return this.clientsService.getClientStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.clientsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, userId, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso o el cliente tiene reservas activas' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.clientsService.remove(id, userId);
  }
}
