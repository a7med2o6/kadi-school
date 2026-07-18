import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TimetableSlotsController } from './timetable-slots.controller';
import { TimetableSlotsService } from './timetable-slots.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimetableSlotsController],
  providers: [TimetableSlotsService],
})
export class TimetableModule {}
