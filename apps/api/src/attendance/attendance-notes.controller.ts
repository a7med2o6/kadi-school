import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { AttendanceNotesService } from './attendance-notes.service';
import { CreateAttendanceNoteDto, ListAttendanceNotesQueryDto } from './dto/attendance-note.dto';

@Controller('attendance/notes')
export class AttendanceNotesController {
  constructor(private readonly service: AttendanceNotesService) {}

  @Get()
  @RequirePermission('attendance:read')
  list(@Query() query: ListAttendanceNotesQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermission('attendance:write')
  create(@Body() dto: CreateAttendanceNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }
}
