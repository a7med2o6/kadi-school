import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentGradesController } from './student-grades.controller';
import { StudentGradesService } from './student-grades.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudentGradesController],
  providers: [StudentGradesService],
})
export class GradesModule {}
