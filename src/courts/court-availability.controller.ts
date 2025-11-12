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
import { CourtAvailabilityService } from './court-availability.service';
import {
  CreateCourtAvailabilityDto,
  UpdateCourtAvailabilityDto,
  CheckAvailabilityDto,
} from './dto/court-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Disponibilidad de Canchas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('court-availability')
export class CourtAvailabilityController {
  constructor(
    private readonly availabilityService: CourtAvailabilityService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear bloqueo de disponibilidad',
    description: `
      Bloquea una cancha en un período específico.
      - Puede ser todo el día (sin especificar startTime/endTime)
      - O un horario específico (con startTime/endTime)
      
      Razones disponibles:
      - maintenance: Mantenimiento
      - private_event: Evento privado
      - weather: Condiciones climáticas
      - other: Otro motivo
    `,
  })
  @ApiResponse({ status: 201, description: 'Bloqueo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  create(
    @GetUser('id') userId: string,
    @Body() createDto: CreateCourtAvailabilityDto,
  ) {
    return this.availabilityService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar bloqueos de disponibilidad',
    description: 'Obtiene todos los bloqueos de las canchas del usuario',
  })
  @ApiQuery({
    name: 'courtId',
    required: false,
    type: String,
    description: 'Filtrar por cancha',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiResponse({ status: 200, description: 'Lista de bloqueos' })
  findAll(
    @GetUser('id') userId: string,
    @Query('courtId') courtId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.availabilityService.findAll(userId, courtId, active);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Verificar disponibilidad de cancha (requiere autenticación)',
    description: `
      Verifica si una cancha está disponible en una fecha/hora específica.
      Retorna información sobre bloqueos si la cancha no está disponible.
      
      NOTA: Este endpoint requiere autenticación JWT.
      Para consultas públicas (apps móviles, web), usar: GET /public/courts/:courtId/availability
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de disponibilidad',
    schema: {
      example: {
        available: false,
        message: 'Cancha bloqueada de 14:00 a 18:00: maintenance',
        reason: 'maintenance',
        description: 'Reparación de césped sintético',
        blockId: '550e8400-e29b-41d4-a716-446655440000',
        blockedFrom: '14:00',
        blockedTo: '18:00',
      },
    },
  })
  checkAvailability(@Query() checkDto: CheckAvailabilityDto) {
    return this.availabilityService.checkAvailability(checkDto);
  }

  @Get('active-blocks')
  @ApiOperation({
    summary: 'Obtener bloqueos activos en un rango de fechas',
    description: 'Retorna todos los bloqueos activos para una cancha en un período',
  })
  @ApiQuery({ name: 'courtId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Lista de bloqueos activos' })
  getActiveBlocks(
    @Query('courtId') courtId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.availabilityService.getActiveBlocks(courtId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener bloqueo por ID' })
  @ApiResponse({ status: 200, description: 'Bloqueo encontrado' })
  @ApiResponse({ status: 404, description: 'Bloqueo no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.availabilityService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar bloqueo' })
  @ApiResponse({ status: 200, description: 'Bloqueo actualizado' })
  @ApiResponse({ status: 404, description: 'Bloqueo no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateDto: UpdateCourtAvailabilityDto,
  ) {
    return this.availabilityService.update(id, userId, updateDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Activar/desactivar bloqueo',
    description: 'Cambia el estado isActive del bloqueo sin eliminarlo',
  })
  @ApiResponse({ status: 200, description: 'Estado cambiado' })
  toggleActive(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.availabilityService.toggleActive(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar bloqueo' })
  @ApiResponse({ status: 200, description: 'Bloqueo eliminado' })
  @ApiResponse({ status: 404, description: 'Bloqueo no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.availabilityService.remove(id, userId);
  }
}
