import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.subject.findMany({ orderBy: { name: 'asc' } });
  }

  async get(id: string) {
    const subject = await this.prisma.client.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  create(dto: CreateSubjectDto) {
    return this.prisma.client.subject.create({ data: dto });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.get(id);
    return this.prisma.client.subject.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.subject.delete({ where: { id } });
  }
}
