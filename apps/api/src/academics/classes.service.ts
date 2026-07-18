import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.class.findMany({
      include: {
        gradeLevel: true,
        academicYear: true,
        homeroomTeacher: { include: { user: { select: SAFE_USER_FIELDS } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string) {
    const klass = await this.prisma.client.class.findUnique({
      where: { id },
      include: {
        gradeLevel: true,
        academicYear: true,
        homeroomTeacher: { include: { user: { select: SAFE_USER_FIELDS } } },
      },
    });
    if (!klass) throw new NotFoundException('Class not found');
    return klass;
  }

  create(dto: CreateClassDto) {
    return this.prisma.client.class.create({ data: dto });
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.get(id);
    return this.prisma.client.class.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.class.delete({ where: { id } });
  }
}
