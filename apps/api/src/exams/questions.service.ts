import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuestionDto, ListQuestionsQueryDto } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListQuestionsQueryDto) {
    return this.prisma.client.question.findMany({
      where: { subjectId: query.subjectId, difficulty: query.difficulty },
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const question = await this.prisma.client.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  create(dto: CreateQuestionDto) {
    return this.prisma.client.question.create({
      data: { subjectId: dto.subjectId, body: dto.body, difficulty: dto.difficulty, points: dto.points },
      include: { subject: true },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.question.delete({ where: { id } });
  }
}
