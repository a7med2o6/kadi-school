import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreateTimetableSlotDto, UpdateTimetableSlotDto } from './dto/timetable-slot.dto';

const INCLUDE = {
  classSubject: {
    include: {
      class: true,
      subject: true,
      teacher: { include: { user: { select: SAFE_USER_FIELDS } } },
    },
  },
} as const;

@Injectable()
export class TimetableSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.timetableSlot.findMany({ include: INCLUDE, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
  }

  async get(id: string) {
    const slot = await this.prisma.client.timetableSlot.findUnique({ where: { id }, include: INCLUDE });
    if (!slot) throw new NotFoundException('Timetable slot not found');
    return slot;
  }

  async create(dto: CreateTimetableSlotDto) {
    this.assertValidRange(dto.startTime, dto.endTime);

    const classSubject = await this.prisma.client.classSubject.findUnique({ where: { id: dto.classSubjectId } });
    if (!classSubject) throw new NotFoundException('Class-subject assignment not found');

    await this.assertNoConflicts({
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      room: dto.room,
      classId: classSubject.classId,
      teacherId: classSubject.teacherId,
    });

    return this.prisma.client.timetableSlot.create({ data: dto, include: INCLUDE });
  }

  async update(id: string, dto: UpdateTimetableSlotDto) {
    const existing = await this.get(id);

    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    const room = dto.room ?? existing.room ?? undefined;
    this.assertValidRange(startTime, endTime);

    await this.assertNoConflicts({
      dayOfWeek,
      startTime,
      endTime,
      room,
      classId: existing.classSubject.classId,
      teacherId: existing.classSubject.teacherId,
      excludeId: id,
    });

    return this.prisma.client.timetableSlot.update({
      where: { id },
      data: { dayOfWeek: dto.dayOfWeek, startTime: dto.startTime, endTime: dto.endTime, room: dto.room },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.timetableSlot.delete({ where: { id } });
  }

  private assertValidRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  private async assertNoConflicts(params: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
    classId: string;
    teacherId: string | null;
    excludeId?: string;
  }) {
    const overlapping = await this.prisma.client.timetableSlot.findMany({
      where: {
        id: params.excludeId ? { not: params.excludeId } : undefined,
        dayOfWeek: params.dayOfWeek,
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
      },
      include: INCLUDE,
    });

    for (const slot of overlapping) {
      if (slot.classSubject.classId === params.classId) {
        throw new ConflictException(
          `Class already has "${slot.classSubject.subject.name}" scheduled at this time (${slot.startTime}-${slot.endTime})`,
        );
      }
      if (params.teacherId && slot.classSubject.teacherId === params.teacherId) {
        throw new ConflictException(
          `Teacher is already teaching "${slot.classSubject.class.name}" at this time (${slot.startTime}-${slot.endTime})`,
        );
      }
      if (params.room && slot.room === params.room) {
        throw new ConflictException(`Room "${params.room}" is already booked at this time (${slot.startTime}-${slot.endTime})`);
      }
    }
  }
}
