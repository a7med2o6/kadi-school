import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { ListTeacherAttendanceQueryDto, UpsertTeacherAttendanceDto } from './dto/teacher-attendance.dto';

@Controller('attendance/teachers')
export class TeacherAttendanceController {
  constructor(private readonly service: TeacherAttendanceService) {}

  @Get()
  @RequirePermission('teacher-attendance:read')
  list(@Query() query: ListTeacherAttendanceQueryDto) {
    return this.service.list(query);
  }

  @Post('upsert')
  @RequirePermission('teacher-attendance:write')
  upsert(@Body() dto: UpsertTeacherAttendanceDto) {
    return this.service.upsert(dto);
  }
}
