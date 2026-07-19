import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { ListTeacherAttendanceQueryDto, UpsertTeacherAttendanceDto } from './dto/teacher-attendance.dto';

const INCLUDE = {
  teacher: { include: { user: { select: SAFE_USER_FIELDS } } },
} as const;

@Injectable()
export class TeacherAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListTeacherAttendanceQueryDto) {
    return this.prisma.client.teacherAttendance.findMany({
      where: {
        teacherId: query.teacherId,
        date: query.date
          ? new Date(query.date)
          : query.from || query.to
            ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined }
            : undefined,
      },
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  upsert(dto: UpsertTeacherAttendanceDto) {
    const date = new Date(dto.date);
    return this.prisma.client.teacherAttendance.upsert({
      where: { teacherId_date: { teacherId: dto.teacherId, date } },
      create: {
        teacherId: dto.teacherId,
        date,
        status: dto.status,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        note: dto.note,
      },
      update: {
        status: dto.status,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        note: dto.note,
      },
      include: INCLUDE,
    });
  }
}
