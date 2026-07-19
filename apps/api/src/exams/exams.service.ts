import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionDifficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { GenerateExamDto, ListExamsQueryDto, ListExamScheduleQueryDto } from './dto/exam.dto';

const INCLUDE = {
  subject: true,
  class: true,
  examQuestions: { include: { question: true }, orderBy: { order: 'asc' as const } },
};

// Schedule-only shape — deliberately excludes examQuestions/question content so
// Student/Parent self-service (exams:read) can see *when* an exam is without
// seeing the paper itself ahead of time.
const SCHEDULE_SELECT = {
  id: true,
  name: true,
  examType: true,
  examDate: true,
  subject: { select: { name: true } },
  class: { select: { name: true } },
} as const;

// Question bank difficulty mix this school targets (45% easy / 35% medium /
// 20% hard) — the generator samples toward this split rather than picking
// uniformly at random, so a generated paper's difficulty curve matches the
// bank's own composition shown on the dashboard.
const DIFFICULTY_MIX: Record<QuestionDifficulty, number> = {
  EASY: 0.45,
  MEDIUM: 0.35,
  HARD: 0.2,
};
const DEFAULT_QUESTION_COUNT = 10;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListExamsQueryDto) {
    return this.prisma.client.exam.findMany({
      where: { subjectId: query.subjectId },
      include: INCLUDE,
      orderBy: { examDate: 'desc' },
    });
  }

  schedule(query: ListExamScheduleQueryDto) {
    return this.prisma.client.exam.findMany({
      where: { classId: query.classId },
      select: SCHEDULE_SELECT,
      orderBy: { examDate: 'asc' },
    });
  }

  async get(id: string) {
    const exam = await this.prisma.client.exam.findUnique({ where: { id }, include: INCLUDE });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.exam.delete({ where: { id } });
  }

  async generate(dto: GenerateExamDto) {
    const pool: { id: string; difficulty: QuestionDifficulty }[] = await this.prisma.client.question.findMany({
      where: { subjectId: dto.subjectId },
    });
    if (pool.length === 0) {
      throw new BadRequestException('This subject has no questions in the bank yet');
    }

    const requested = Math.min(dto.questionCount ?? DEFAULT_QUESTION_COUNT, pool.length);
    const byDifficulty: Record<QuestionDifficulty, typeof pool> = { EASY: [], MEDIUM: [], HARD: [] };
    for (const q of pool) byDifficulty[q.difficulty].push(q);

    const selected: typeof pool = [];
    const remaining: typeof pool = [];
    for (const difficulty of Object.keys(DIFFICULTY_MIX) as QuestionDifficulty[]) {
      const target = Math.round(requested * DIFFICULTY_MIX[difficulty]);
      const shuffled = shuffle(byDifficulty[difficulty]);
      selected.push(...shuffled.slice(0, target));
      remaining.push(...shuffled.slice(target));
    }

    // Rounding the per-difficulty targets can under- or over-shoot `requested`;
    // top up from (or trim) the leftover pool so the exam has exactly the
    // requested count whenever the bank has enough questions.
    if (selected.length < requested) {
      selected.push(...shuffle(remaining).slice(0, requested - selected.length));
    }
    const finalQuestions = shuffle(selected).slice(0, requested);

    // Two top-level calls, not a nested `examQuestions: { create: [...] }` —
    // the tenant-scoping extension only intercepts top-level model
    // operations, so a nested create would skip schoolId injection on
    // ExamQuestion and fail its NOT NULL constraint. Both calls share the
    // one transaction TenantMiddleware already opened for this request.
    const exam = await this.prisma.client.exam.create({
      data: {
        subjectId: dto.subjectId,
        classId: dto.classId,
        name: dto.name,
        examType: dto.examType,
        examDate: new Date(dto.examDate),
      },
    });

    await this.prisma.client.examQuestion.createMany({
      data: finalQuestions.map((q, index) => ({ examId: exam.id, questionId: q.id, order: index + 1 })),
    });

    return this.get(exam.id);
  }
}
