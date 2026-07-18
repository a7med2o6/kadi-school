import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.academicYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  async get(id: string) {
    const year = await this.prisma.client.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('Academic year not found');
    return year;
  }

  async create(dto: CreateAcademicYearDto) {
    if (dto.isCurrent) {
      await this.unsetCurrent();
    }
    return this.prisma.client.academicYear.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    await this.get(id);
    if (dto.isCurrent) {
      await this.unsetCurrent();
    }
    return this.prisma.client.academicYear.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.academicYear.delete({ where: { id } });
  }

  private async unsetCurrent() {
    await this.prisma.client.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
  }
}
