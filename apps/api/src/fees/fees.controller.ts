import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { FeesService } from './fees.service';
import { CreateFeeInvoiceDto, ListFeeInvoicesQueryDto } from './dto/fee.dto';

@Controller('fees')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get()
  @RequirePermission('finance:read')
  list(@Query() query: ListFeeInvoicesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
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
