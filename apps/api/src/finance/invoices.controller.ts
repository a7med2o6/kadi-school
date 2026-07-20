import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, ListInvoicesQueryDto } from './dto/invoice.dto';
import { CreatePaymentDto } from './dto/payment.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @RequirePermission('finance:read')
  list(@Query() query: ListInvoicesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @RequirePermission('finance:read')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.get(id, user);
  }

  @Post()
  @RequirePermission('finance:write')
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    if (!user.permissions.includes('finance:write') && !user.permissions.includes('payments:create')) {
      throw new ForbiddenException('Not authorized to record payments');
    }
    return this.service.addPayment(id, dto, user);
  }
}
