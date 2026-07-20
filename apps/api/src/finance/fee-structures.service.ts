import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFeeStructureDto, UpdateFeeStructureDto } from './dto/fee-structure.dto';

const INCLUDE = {
  class: true,
  academicYear: true,
} as const;

@Injectable()
export class FeeStructuresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.feeStructure.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const structure = await this.prisma.client.feeStructure.findUnique({ where: { id }, include: INCLUDE });
    if (!structure) throw new NotFoundException('Fee structure not found');
    return structure;
  }

  create(dto: CreateFeeStructureDto) {
    return this.prisma.client.feeStructure.create({
      data: {
        name: dto.name,
        classId: dto.classId,
        amount: dto.amount,
        frequency: dto.frequency,
        academicYearId: dto.academicYearId,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateFeeStructureDto) {
    await this.get(id);
    return this.prisma.client.feeStructure.update({
      where: { id },
      data: {
        name: dto.name,
        classId: dto.classId,
        amount: dto.amount,
        frequency: dto.frequency,
        academicYearId: dto.academicYearId,
      },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.feeStructure.delete({ where: { id } });
  }
}
