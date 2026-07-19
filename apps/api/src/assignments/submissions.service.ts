import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { BulkUpsertSubmissionsDto } from './dto/submission.dto';

const INCLUDE = {
  student: { include: { user: { select: SAFE_USER_FIELDS } } },
} as const;

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(assignmentId: string) {
    return this.prisma.client.assignmentSubmission.findMany({
      where: { assignmentId },
      include: INCLUDE,
    });
  }

  async bulkUpsert(assignmentId: string, dto: BulkUpsertSubmissionsDto) {
    const existing: { studentId: string; submittedAt: Date | null }[] =
      await this.prisma.client.assignmentSubmission.findMany({ where: { assignmentId } });
    const existingByStudent = new Map(existing.map((s) => [s.studentId, s]));

    const rows = [];
    for (const record of dto.records) {
      // Only stamp a fresh submittedAt on the not-submitted -> submitted
      // transition; re-saving a score for an already-submitted row must not
      // bump its original submission time.
      const priorSubmittedAt = existingByStudent.get(record.studentId)?.submittedAt ?? null;
      const submittedAt = record.submitted ? (priorSubmittedAt ?? new Date()) : null;

      const row = await this.prisma.client.assignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId: record.studentId } },
        create: {
          assignmentId,
          studentId: record.studentId,
          submittedAt,
          score: record.score,
          feedback: record.feedback,
        },
        update: { submittedAt, score: record.score, feedback: record.feedback },
        include: INCLUDE,
      });
      rows.push(row);
    }
    return rows;
  }
}
