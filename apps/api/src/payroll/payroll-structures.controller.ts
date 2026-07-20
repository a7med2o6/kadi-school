import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { PayrollStructuresService } from './payroll-structures.service';
import { CreatePayrollStructureDto, UpdatePayrollStructureDto } from './dto/payroll-structure.dto';

@Controller('payroll/structures')
export class PayrollStructuresController {
  constructor(private readonly service: PayrollStructuresService) {}

  @Get()
  @RequirePermission('payroll:read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('payroll:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('payroll:write')
  create(@Body() dto: CreatePayrollStructureDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('payroll:write')
  update(@Param('id') id: string, @Body() dto: UpdatePayrollStructureDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('payroll:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
