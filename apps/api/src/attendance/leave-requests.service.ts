import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreateLeaveRequestDto, DecideLeaveRequestDto, ListLeaveRequestsQueryDto } from './dto/leave-request.dto';

const INCLUDE = {
  teacher: { include: { user: { select: SAFE_USER_FIELDS } } },
} as const;

function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListLeaveRequestsQueryDto) {
    return this.prisma.client.teacherLeaveRequest.findMany({
      where: { status: query.status },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateLeaveRequestDto) {
    return this.prisma.client.teacherLeaveRequest.create({
      data: {
        teacherId: dto.teacherId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
      include: INCLUDE,
    });
  }

  async decide(id: string, dto: DecideLeaveRequestDto) {
    const request = await this.prisma.client.teacherLeaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Leave request not found');

    const updated = await this.prisma.client.teacherLeaveRequest.update({
      where: { id },
      data: { status: dto.status },
      include: INCLUDE,
    });

    if (dto.status === 'APPROVED') {
      for (const date of eachDateInRange(request.startDate, request.endDate)) {
        await this.prisma.client.teacherAttendance.upsert({
          where: { teacherId_date: { teacherId: request.teacherId, date } },
          create: { teacherId: request.teacherId, date, status: 'ON_LEAVE' },
          update: { status: 'ON_LEAVE' },
        });
      }
    }

    return updated;
  }
}
