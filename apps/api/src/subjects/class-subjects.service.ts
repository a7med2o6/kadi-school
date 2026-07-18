import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreateClassSubjectDto, UpdateClassSubjectDto } from './dto/class-subject.dto';

const INCLUDE = {
  class: true,
  subject: true,
  teacher: { include: { user: { select: SAFE_USER_FIELDS } } },
} as const;

@Injectable()
export class ClassSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.classSubject.findMany({ include: INCLUDE });
  }

  async get(id: string) {
    const classSubject = await this.prisma.client.classSubject.findUnique({ where: { id }, include: INCLUDE });
    if (!classSubject) throw new NotFoundException('Class-subject assignment not found');
    return classSubject;
  }

  create(dto: CreateClassSubjectDto) {
    return this.prisma.client.classSubject.create({ data: dto, include: INCLUDE });
  }

  async update(id: string, dto: UpdateClassSubjectDto) {
    await this.get(id);
    return this.prisma.client.classSubject.update({ where: { id }, data: dto, include: INCLUDE });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.classSubject.delete({ where: { id } });
  }
}
