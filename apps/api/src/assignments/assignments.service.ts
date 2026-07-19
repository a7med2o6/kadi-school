import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAssignmentDto, ListAssignmentsQueryDto } from './dto/assignment.dto';

const INCLUDE = {
  classSubject: { include: { class: true, subject: true } },
  submissions: true,
} as const;

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListAssignmentsQueryDto) {
    return this.prisma.client.assignment.findMany({
      where: { classSubjectId: query.classSubjectId },
      include: INCLUDE,
      orderBy: { dueAt: 'desc' },
    });
  }

  async get(id: string) {
    const assignment = await this.prisma.client.assignment.findUnique({ where: { id }, include: INCLUDE });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  create(dto: CreateAssignmentDto) {
    return this.prisma.client.assignment.create({
      data: {
        classSubjectId: dto.classSubjectId,
        title: dto.title,
        description: dto.description,
        dueAt: new Date(dto.dueAt),
        maxScore: dto.maxScore,
      },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.assignment.delete({ where: { id } });
  }
}
