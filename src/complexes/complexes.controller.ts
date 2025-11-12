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
import { ComplexesService } from './complexes.service';
import { CreateComplexDto, UpdateComplexDto } from './dto/complex.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Complejos Deportivos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('complexes')
export class ComplexesController {
  constructor(private readonly complexesService: ComplexesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo complejo deportivo' })
  @ApiResponse({ status: 201, description: 'Complejo creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@GetUser('id') userId: string, @Body() createComplexDto: CreateComplexDto) {
    return this.complexesService.create(userId, createComplexDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los complejos' })
  @ApiQuery({ name: 'myComplexes', required: false, type: Boolean, description: 'Solo mis complejos' })
  @ApiResponse({ status: 200, description: 'Lista de complejos' })
  findAll(@GetUser('id') userId: string, @Query('myComplexes') myComplexes?: string) {
    // Si myComplexes=true, solo devolver los del usuario autenticado
    const filterByUser = myComplexes === 'true';
    return this.complexesService.findAll(filterByUser ? userId : undefined);
  }

  @Get('my-complexes')
  @ApiOperation({ summary: 'Obtener mis complejos' })
  @ApiResponse({ status: 200, description: 'Lista de complejos del usuario' })
  findMyComplexes(@GetUser('id') userId: string) {
    return this.complexesService.findByUser(userId);
  }

  @Get('selector/list')
  @ApiOperation({ 
    summary: 'Obtener lista simplificada de complejos para selector',
    description: 'Retorna solo id y nombre de los complejos del usuario para usar en dropdowns y filtros'
  })
  @ApiResponse({ status: 200, description: 'Lista de complejos simplificada' })
  async getSelector(@GetUser('id') userId: string) {
    return this.complexesService.getSelector(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener complejo por ID' })
  @ApiResponse({ status: 200, description: 'Complejo encontrado' })
  @ApiResponse({ status: 404, description: 'Complejo no encontrado' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.complexesService.findOne(id, userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas del complejo' })
  @ApiResponse({ status: 200, description: 'Estadísticas del complejo' })
  getStats(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.complexesService.getComplexStats(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar complejo' })
  @ApiResponse({ status: 200, description: 'Complejo actualizado' })
  @ApiResponse({ status: 404, description: 'Complejo no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateComplexDto: UpdateComplexDto,
  ) {
    return this.complexesService.update(id, userId, updateComplexDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar complejo' })
  @ApiResponse({ status: 200, description: 'Complejo eliminado' })
  @ApiResponse({ status: 404, description: 'Complejo no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.complexesService.remove(id, userId);
  }
}
