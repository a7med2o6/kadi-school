import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { GradeLevelsService } from './grade-levels.service';
import { CreateGradeLevelDto, UpdateGradeLevelDto } from './dto/grade-level.dto';

@Controller('grade-levels')
export class GradeLevelsController {
  constructor(private readonly service: GradeLevelsService) {}

  @Get()
  @RequirePermission('classes:read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('classes:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('classes:write')
  create(@Body() dto: CreateGradeLevelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('classes:write')
  update(@Param('id') id: string, @Body() dto: UpdateGradeLevelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('classes:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
