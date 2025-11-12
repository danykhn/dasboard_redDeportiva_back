import { Module } from '@nestjs/common';
import { ComplexesService } from './complexes.service';
import { ComplexesController } from './complexes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplexesController],
  providers: [ComplexesService],
  exports: [ComplexesService],
})
export class ComplexesModule {}
