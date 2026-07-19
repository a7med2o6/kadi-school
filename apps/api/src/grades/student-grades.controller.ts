import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { StudentGradesService } from './student-grades.service';
import { BulkUpsertStudentGradesDto, ListStudentGradesQueryDto } from './dto/student-grade.dto';

@Controller('grades')
export class StudentGradesController {
  constructor(private readonly service: StudentGradesService) {}

  @Get()
  @RequirePermission('grades:read')
  list(@Query() query: ListStudentGradesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  @Post('bulk')
  @RequirePermission('grades:write')
  bulkUpsert(@Body() dto: BulkUpsertStudentGradesDto) {
    return this.service.bulkUpsert(dto);
  }
}
