import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { TimetableSlotsService } from './timetable-slots.service';
import { CreateTimetableSlotDto, UpdateTimetableSlotDto } from './dto/timetable-slot.dto';

@Controller('timetable-slots')
export class TimetableSlotsController {
  constructor(private readonly service: TimetableSlotsService) {}

  @Get()
  @RequirePermission('timetable:read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('timetable:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('timetable:write')
  create(@Body() dto: CreateTimetableSlotDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('timetable:write')
  update(@Param('id') id: string, @Body() dto: UpdateTimetableSlotDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('timetable:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
