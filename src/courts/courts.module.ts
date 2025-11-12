import { Module } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';
import { CourtAvailabilityService } from './court-availability.service';
import { CourtAvailabilityController } from './court-availability.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourtsController, CourtAvailabilityController],
  providers: [CourtsService, CourtAvailabilityService],
  exports: [CourtsService, CourtAvailabilityService],
})
export class CourtsModule {}
