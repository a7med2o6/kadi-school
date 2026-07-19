import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, ListQuestionsQueryDto } from './dto/question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get()
  @RequirePermission('exams:read')
  list(@Query() query: ListQuestionsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermission('exams:write')
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @RequirePermission('exams:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
