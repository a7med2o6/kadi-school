import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { FeesService } from './fees.service';
import { CreateFeeInvoiceDto, ListFeeInvoicesQueryDto } from './dto/fee.dto';

@Controller('fees')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get()
  @RequirePermission('finance:read')
  list(@Query() query: ListFeeInvoicesQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermission('finance:write')
  create(@Body() dto: CreateFeeInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id/pay')
  @RequirePermission('finance:write')
  markPaid(@Param('id') id: string) {
    return this.service.markPaid(id);
  }
}
