import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreatePayrollStructureDto, UpdatePayrollStructureDto } from './dto/payroll-structure.dto';

const INCLUDE = {
  teacher: { include: { user: { select: SAFE_USER_FIELDS } } },
} as const;

@Injectable()
export class PayrollStructuresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.payrollStructure.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const structure = await this.prisma.client.payrollStructure.findUnique({ where: { id }, include: INCLUDE });
    if (!structure) throw new NotFoundException('Payroll structure not found');
    return structure;
  }

  create(dto: CreatePayrollStructureDto) {
    return this.prisma.client.payrollStructure.create({
      data: {
        teacherId: dto.teacherId,
        baseSalary: dto.baseSalary,
        allowances: dto.allowances ?? {},
        deductions: dto.deductions ?? {},
        effectiveFrom: new Date(dto.effectiveFrom),
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePayrollStructureDto) {
    await this.get(id);
    return this.prisma.client.payrollStructure.update({
      where: { id },
      data: {
        baseSalary: dto.baseSalary,
        allowances: dto.allowances,
        deductions: dto.deductions,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.payrollStructure.delete({ where: { id } });
  }
}
