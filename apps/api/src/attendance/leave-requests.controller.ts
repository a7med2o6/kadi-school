import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto, DecideLeaveRequestDto, ListLeaveRequestsQueryDto } from './dto/leave-request.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Get()
  @RequirePermission('teacher-attendance:read')
  list(@Query() query: ListLeaveRequestsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermission('teacher-attendance:write')
  create(@Body() dto: CreateLeaveRequestDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('teacher-attendance:write')
  decide(@Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    return this.service.decide(id, dto);
  }
}
