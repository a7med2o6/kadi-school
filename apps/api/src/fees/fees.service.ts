import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFeeInvoiceDto, ListFeeInvoicesQueryDto } from './dto/fee.dto';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListFeeInvoicesQueryDto) {
    return this.prisma.client.feeInvoice.findMany({
      where: { studentId: query.studentId },
      orderBy: { dueDate: 'desc' },
    });
  }

  create(dto: CreateFeeInvoiceDto) {
    return this.prisma.client.feeInvoice.create({
      data: {
        studentId: dto.studentId,
        title: dto.title,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  async markPaid(id: string) {
    const invoice = await this.prisma.client.feeInvoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.prisma.client.feeInvoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
