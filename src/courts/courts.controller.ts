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
import { CourtsService } from './courts.service';
import { CreateCourtDto, UpdateCourtDto } from './dto/court.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Canchas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva cancha' })
  @ApiResponse({ status: 201, description: 'Cancha creada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Complejo no encontrado' })
  create(@GetUser('id') userId: string, @Body() createCourtDto: CreateCourtDto) {
    return this.courtsService.create(userId, createCourtDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar canchas' })
  @ApiQuery({ name: 'complexId', required: false, type: String, description: 'Filtrar por complejo' })
  @ApiQuery({ name: 'myCourts', required: false, type: Boolean, description: 'Solo mis canchas' })
  @ApiResponse({ status: 200, description: 'Lista de canchas' })
  findAll(
    @GetUser('id') userId: string,
    @Query('complexId') complexId?: string,
    @Query('myCourts') myCourts?: string,
  ) {
    const filterByUser = myCourts === 'true';
    return this.courtsService.findAll(filterByUser ? userId : undefined, complexId);
  }

  @Get('by-complex/:complexId')
  @ApiOperation({ summary: 'Obtener canchas de un complejo específico' })
  @ApiResponse({ status: 200, description: 'Lista de canchas del complejo' })
  findByComplex(@Param('complexId') complexId: string, @GetUser('id') userId: string) {
    return this.courtsService.findByComplex(complexId, userId);
  }

  @Get('stats/:complexId')
  @ApiOperation({ summary: 'Obtener estadísticas de canchas de un complejo' })
  @ApiResponse({ status: 200, description: 'Estadísticas de canchas' })
  getStats(@Param('complexId') complexId: string, @GetUser('id') userId: string) {
    return this.courtsService.getCourtStats(complexId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cancha por ID' })
  @ApiResponse({ status: 200, description: 'Cancha encontrada' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.courtsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cancha' })
  @ApiResponse({ status: 200, description: 'Cancha actualizada' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateCourtDto: UpdateCourtDto,
  ) {
    return this.courtsService.update(id, userId, updateCourtDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cancha' })
  @ApiResponse({ status: 200, description: 'Cancha eliminada' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.courtsService.remove(id, userId);
  }
}
