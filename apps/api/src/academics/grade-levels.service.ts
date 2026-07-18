import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGradeLevelDto, UpdateGradeLevelDto } from './dto/grade-level.dto';

@Injectable()
export class GradeLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.gradeLevel.findMany({ orderBy: { order: 'asc' } });
  }

  async get(id: string) {
    const gradeLevel = await this.prisma.client.gradeLevel.findUnique({ where: { id } });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    return gradeLevel;
  }

  create(dto: CreateGradeLevelDto) {
    return this.prisma.client.gradeLevel.create({ data: dto });
  }

  async update(id: string, dto: UpdateGradeLevelDto) {
    await this.get(id);
    return this.prisma.client.gradeLevel.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.gradeLevel.delete({ where: { id } });
  }
}
