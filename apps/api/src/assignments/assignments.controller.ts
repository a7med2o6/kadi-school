import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, ListAssignmentsQueryDto } from './dto/assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Get()
  @RequirePermission('homework:read')
  list(@Query() query: ListAssignmentsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermission('homework:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('homework:write')
  create(@Body() dto: CreateAssignmentDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @RequirePermission('homework:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
