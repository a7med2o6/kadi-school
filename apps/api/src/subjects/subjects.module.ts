import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { ClassSubjectsController } from './class-subjects.controller';
import { ClassSubjectsService } from './class-subjects.service';

@Module({
  imports: [PrismaModule],
  controllers: [SubjectsController, ClassSubjectsController],
  providers: [SubjectsService, ClassSubjectsService],
})
export class SubjectsModule {}
