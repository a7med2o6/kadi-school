import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { FeeStructuresService } from './fee-structures.service';
import { CreateFeeStructureDto, UpdateFeeStructureDto } from './dto/fee-structure.dto';

@Controller('fee-structures')
export class FeeStructuresController {
  constructor(private readonly service: FeeStructuresService) {}

  @Get()
  @RequirePermission('finance:read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('finance:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('finance:write')
  create(@Body() dto: CreateFeeStructureDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('finance:write')
  update(@Param('id') id: string, @Body() dto: UpdateFeeStructureDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('finance:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
