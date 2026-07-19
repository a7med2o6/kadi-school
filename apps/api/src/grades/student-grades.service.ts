import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { BulkUpsertStudentGradesDto, ListStudentGradesQueryDto } from './dto/student-grade.dto';

const INCLUDE = {
  student: { include: { user: { select: SAFE_USER_FIELDS } } },
  classSubject: { include: { subject: true, class: true } },
} as const;

@Injectable()
export class StudentGradesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListStudentGradesQueryDto) {
    return this.prisma.client.studentGrade.findMany({
      where: { classSubjectId: query.classSubjectId, studentId: query.studentId, term: query.term },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async bulkUpsert(dto: BulkUpsertStudentGradesDto) {
    const rows = [];
    // Sequential, not Promise.all — shares the single request transaction
    // TenantMiddleware already opened, without racing the same unique key.
    for (const record of dto.records) {
      const row = await this.prisma.client.studentGrade.upsert({
        where: {
          studentId_classSubjectId_term_component: {
            studentId: record.studentId,
            classSubjectId: dto.classSubjectId,
            term: dto.term,
            component: record.component,
          },
        },
        create: {
          studentId: record.studentId,
          classSubjectId: dto.classSubjectId,
          term: dto.term,
          component: record.component,
          score: record.score,
        },
        update: { score: record.score },
        include: INCLUDE,
      });
      rows.push(row);
    }
    return rows;
  }
}
