import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { assertCanAccessStudent } from '../students/student-access.util';
import type { BulkUpsertStudentAttendanceDto, ListStudentAttendanceQueryDto } from './dto/student-attendance.dto';

const INCLUDE = {
  student: { include: { user: { select: SAFE_USER_FIELDS } } },
  class: true,
} as const;

@Injectable()
export class StudentAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListStudentAttendanceQueryDto, user: AuthenticatedUser) {
    if (query.studentId) {
      await assertCanAccessStudent(this.prisma, user, query.studentId);
    }
    return this.prisma.client.studentAttendance.findMany({
      where: {
        classId: query.classId,
        studentId: query.studentId,
        date: query.date
          ? new Date(query.date)
          : query.from || query.to
            ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined }
            : undefined,
      },
      include: INCLUDE,
      orderBy: { date: 'asc' },
    });
  }

  async bulkUpsert(dto: BulkUpsertStudentAttendanceDto) {
    const date = new Date(dto.date);
    const rows = [];
    // Sequential upserts (not Promise.all) so they share the single request
    // transaction TenantMiddleware already opened, without racing on the
    // (studentId, date) unique constraint for records in the same batch.
    for (const record of dto.records) {
      const row = await this.prisma.client.studentAttendance.upsert({
        where: { studentId_date: { studentId: record.studentId, date } },
        create: {
          studentId: record.studentId,
          classId: dto.classId,
          date,
          status: record.status,
          arrivalTime: record.arrivalTime,
          note: record.note,
        },
        update: {
          status: record.status,
          arrivalTime: record.arrivalTime,
          note: record.note,
        },
        include: INCLUDE,
      });
      rows.push(row);
    }
    return rows;
  }
}
