import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { GeneratePayslipsDto, ListPayslipsQueryDto, UpdatePayslipDto } from './dto/payslip.dto';

const INCLUDE = {
  payrollStructure: { include: { teacher: { include: { user: { select: SAFE_USER_FIELDS } } } } },
} as const;

function sumValues(map: unknown): number {
  if (!map || typeof map !== 'object') return 0;
  return Object.values(map as Record<string, number>).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

@Injectable()
export class PayslipsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListPayslipsQueryDto) {
    return this.prisma.client.payslip.findMany({
      where: {
        periodMonth: query.periodMonth,
        status: query.status,
        payrollStructure: query.teacherId ? { teacherId: query.teacherId } : undefined,
      },
      include: INCLUDE,
      orderBy: { generatedAt: 'desc' },
    });
  }

  // Synchronous "background job" stand-in: loops every active payroll
  // structure in the tenant and upserts one payslip per period, so
  // re-running the same month is idempotent rather than erroring.
  async generate(dto: GeneratePayslipsDto) {
    const structures = await this.prisma.client.payrollStructure.findMany();
    const results = [];
    for (const structure of structures) {
      const gross = Number(structure.baseSalary) + sumValues(structure.allowances);
      const net = gross - sumValues(structure.deductions);
      const payslip = await this.prisma.client.payslip.upsert({
        where: { payrollStructureId_periodMonth: { payrollStructureId: structure.id, periodMonth: dto.periodMonth } },
        create: {
          payrollStructureId: structure.id,
          periodMonth: dto.periodMonth,
          gross,
          net,
        },
        update: { gross, net },
        include: INCLUDE,
      });
      results.push(payslip);
    }
    return results;
  }

  async updateStatus(id: string, dto: UpdatePayslipDto) {
    const payslip = await this.prisma.client.payslip.findUnique({ where: { id } });
    if (!payslip) throw new NotFoundException('Payslip not found');
    return this.prisma.client.payslip.update({ where: { id }, data: { status: dto.status }, include: INCLUDE });
  }
}
