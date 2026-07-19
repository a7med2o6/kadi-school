import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuestionsController, ExamsController],
  providers: [QuestionsService, ExamsService],
})
export class ExamsModule {}
