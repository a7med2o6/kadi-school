import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { StudentAttendanceService } from './student-attendance.service';
import { BulkUpsertStudentAttendanceDto, ListStudentAttendanceQueryDto } from './dto/student-attendance.dto';

@Controller('attendance/students')
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Get()
  @RequirePermission('attendance:read')
  list(@Query() query: ListStudentAttendanceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  @Post('bulk')
  @RequirePermission('attendance:write')
  bulkUpsert(@Body() dto: BulkUpsertStudentAttendanceDto) {
    return this.service.bulkUpsert(dto);
  }
}
