import { Module } from '@nestjs/common';
import { PublicCourtsController } from './public-courts.controller';
import { PublicBookingsController } from './public-bookings.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CourtAvailabilityService } from '../courts/court-availability.service';

@Module({
  controllers: [PublicCourtsController, PublicBookingsController],
  providers: [PrismaService, CourtAvailabilityService],
})
export class PublicModule {}
