import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { ExamsService } from './exams.service';
import { GenerateExamDto, ListExamsQueryDto } from './dto/exam.dto';

@Controller('exams')
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  @Get()
  @RequirePermission('exams:read')
  list(@Query() query: ListExamsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermission('exams:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post('generate')
  @RequirePermission('exams:write')
  generate(@Body() dto: GenerateExamDto) {
    return this.service.generate(dto);
  }

  @Delete(':id')
  @RequirePermission('exams:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
