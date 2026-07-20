import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { PayslipsService } from './payslips.service';
import { GeneratePayslipsDto, ListPayslipsQueryDto, UpdatePayslipDto } from './dto/payslip.dto';

@Controller('payroll/payslips')
export class PayslipsController {
  constructor(private readonly service: PayslipsService) {}

  @Get()
  @RequirePermission('payroll:read')
  list(@Query() query: ListPayslipsQueryDto) {
    return this.service.list(query);
  }

  @Post('generate')
  @RequirePermission('payroll:write')
  generate(@Body() dto: GeneratePayslipsDto) {
    return this.service.generate(dto);
  }

  @Patch(':id')
  @RequirePermission('payroll:write')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePayslipDto) {
    return this.service.updateStatus(id, dto);
  }
}
