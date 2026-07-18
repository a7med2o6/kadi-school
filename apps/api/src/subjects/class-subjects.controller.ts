import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { ClassSubjectsService } from './class-subjects.service';
import { CreateClassSubjectDto, UpdateClassSubjectDto } from './dto/class-subject.dto';

@Controller('class-subjects')
export class ClassSubjectsController {
  constructor(private readonly service: ClassSubjectsService) {}

  @Get()
  @RequirePermission('subjects:read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('subjects:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('subjects:write')
  create(@Body() dto: CreateClassSubjectDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('subjects:write')
  update(@Param('id') id: string, @Body() dto: UpdateClassSubjectDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('subjects:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
