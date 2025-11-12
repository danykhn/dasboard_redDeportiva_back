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
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CheckAvailabilityDto,
} from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Reservas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva reserva' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cancha o cliente no encontrado' })
  @ApiResponse({ status: 409, description: 'Horario no disponible' })
  create(@GetUser('id') userId: string, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(userId, createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reservas' })
  @ApiQuery({ name: 'myBookings', required: false, type: Boolean, description: 'Solo mis reservas' })
  @ApiQuery({ name: 'courtId', required: false, type: String, description: 'Filtrar por cancha' })
  @ApiQuery({ name: 'clientId', required: false, type: String, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Fecha desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Fecha hasta (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Lista de reservas' })
  findAll(
    @GetUser('id') userId: string,
    @Query('myBookings') myBookings?: string,
    @Query('courtId') courtId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filterByUser = myBookings === 'true';
    return this.bookingsService.findAll(filterByUser ? userId : undefined, {
      courtId,
      clientId,
      status,
      dateFrom,
      dateTo,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de reservas' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Fecha desde' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Fecha hasta' })
  @ApiResponse({ status: 200, description: 'Estadísticas de reservas' })
  getStats(
    @GetUser('id') userId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.bookingsService.getBookingStats(userId, { dateFrom, dateTo });
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Verificar disponibilidad de cancha' })
  @ApiResponse({ status: 200, description: 'Disponibilidad consultada' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  checkAvailability(@Body() checkAvailabilityDto: CheckAvailabilityDto) {
    return this.bookingsService.checkAvailability(checkAvailabilityDto);
  }

  @Get('court/:courtId')
  @ApiOperation({ summary: 'Obtener reservas de una cancha' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Fecha específica (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Lista de reservas de la cancha' })
  getCourtBookings(
    @Param('courtId') courtId: string,
    @GetUser('id') userId: string,
    @Query('date') date?: string,
  ) {
    return this.bookingsService.getCourtBookings(courtId, userId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener reserva por ID' })
  @ApiResponse({ status: 200, description: 'Reserva encontrada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.bookingsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar reserva' })
  @ApiResponse({ status: 200, description: 'Reserva actualizada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  @ApiResponse({ status: 409, description: 'Nuevo horario no disponible' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, userId, updateBookingDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar' })
  cancelBooking(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.bookingsService.cancelBooking(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar reserva' })
  @ApiResponse({ status: 200, description: 'Reserva eliminada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.bookingsService.remove(id, userId);
  }
}
