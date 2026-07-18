import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

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
  create(@Body() dto: CreateClassDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('classes:write')
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('classes:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
