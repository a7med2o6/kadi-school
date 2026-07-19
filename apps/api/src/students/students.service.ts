import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import { assignDefaultRole } from '../iam/assign-default-role';
import type { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

const INCLUDE = {
  user: { select: SAFE_USER_FIELDS },
  class: true,
  guardians: { include: { parent: { include: { user: { select: SAFE_USER_FIELDS } } } } },
} as const;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.student.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const student = await this.prisma.client.student.findUnique({ where: { id }, include: INCLUDE });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async getByUserId(userId: string) {
    const student = await this.prisma.client.student.findUnique({ where: { userId }, include: INCLUDE });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async create(dto: CreateStudentDto) {
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.client.user.create({
      data: { civilId: dto.civilId, email: dto.email, passwordHash },
    });
    await assignDefaultRole(this.prisma, user.id, 'Student');

    return this.prisma.client.student.create({
      data: {
        userId: user.id,
        admissionNumber: dto.admissionNumber,
        classId: dto.classId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        nationality: dto.nationality,
        busRoute: dto.busRoute,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.get(id);
    return this.prisma.client.student.update({
      where: { id },
      data: {
        classId: dto.classId,
        status: dto.status,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        nationality: dto.nationality,
        busRoute: dto.busRoute,
      },
      include: INCLUDE,
    });
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const student = await this.get(id);
    await this.prisma.client.user.update({ where: { id: student.userId }, data: { avatarUrl } });
    return this.get(id);
  }

  async remove(id: string) {
    const student = await this.get(id);
    await this.prisma.client.user.update({ where: { id: student.userId }, data: { status: 'SUSPENDED' } });
  }
}
