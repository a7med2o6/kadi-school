import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreateAttendanceNoteDto, ListAttendanceNotesQueryDto } from './dto/attendance-note.dto';

const INCLUDE = {
  authorUser: { select: SAFE_USER_FIELDS },
} as const;

@Injectable()
export class AttendanceNotesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListAttendanceNotesQueryDto) {
    return this.prisma.client.studentAttendanceNote.findMany({
      where: { studentId: query.studentId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateAttendanceNoteDto, authorUserId: string) {
    return this.prisma.client.studentAttendanceNote.create({
      data: { studentId: dto.studentId, body: dto.body, authorUserId },
      include: INCLUDE,
    });
  }
}
