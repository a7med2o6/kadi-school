import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { StudentAttendanceService } from './student-attendance.service';
import { BulkUpsertStudentAttendanceDto, ListStudentAttendanceQueryDto } from './dto/student-attendance.dto';

@Controller('attendance/students')
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Get()
  @RequirePermission('attendance:read')
  list(@Query() query: ListStudentAttendanceQueryDto) {
    return this.service.list(query);
  }

  @Post('bulk')
  @RequirePermission('attendance:write')
  bulkUpsert(@Body() dto: BulkUpsertStudentAttendanceDto) {
    return this.service.bulkUpsert(dto);
  }
}
