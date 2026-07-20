import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { assertCanAccessStudent } from '../students/student-access.util';
import type { CreateInvoiceDto, ListInvoicesQueryDto } from './dto/invoice.dto';
import type { CreatePaymentDto } from './dto/payment.dto';

const INCLUDE = {
  student: { select: { id: true, admissionNumber: true, user: { select: SAFE_USER_FIELDS } } },
  feeStructure: true,
  payments: { orderBy: { paidAt: 'desc' as const } },
} as const;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListInvoicesQueryDto, user: AuthenticatedUser) {
    if (query.studentId) {
      await assertCanAccessStudent(this.prisma, user, query.studentId);
    }
    return this.prisma.client.invoice.findMany({
      where: { studentId: query.studentId, status: query.status },
      include: INCLUDE,
      orderBy: { dueDate: 'desc' },
    });
  }

  async get(id: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.client.invoice.findUnique({ where: { id }, include: INCLUDE });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await assertCanAccessStudent(this.prisma, user, invoice.studentId);
    return invoice;
  }

  create(dto: CreateInvoiceDto) {
    return this.prisma.client.invoice.create({
      data: {
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        title: dto.title,
        amountDue: dto.amountDue,
        dueDate: new Date(dto.dueDate),
      },
      include: INCLUDE,
    });
  }

  async addPayment(invoiceId: string, dto: CreatePaymentDto, user: AuthenticatedUser) {
    const invoice = await this.prisma.client.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await assertCanAccessStudent(this.prisma, user, invoice.studentId);

    await this.prisma.client.payment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        method: dto.method,
        referenceNumber: dto.referenceNumber,
        recordedByUserId: user.id,
      },
    });

    const payments = await this.prisma.client.payment.findMany({ where: { invoiceId } });
    const paidTotal = payments.reduce((sum: number, p: (typeof payments)[number]) => sum + Number(p.amount), 0);
    const status =
      paidTotal >= Number(invoice.amountDue)
        ? 'PAID'
        : paidTotal > 0
          ? 'PARTIAL'
          : invoice.dueDate < new Date()
            ? 'OVERDUE'
            : 'PENDING';

    return this.prisma.client.invoice.update({
      where: { id: invoiceId },
      data: { status },
      include: INCLUDE,
    });
  }
}
