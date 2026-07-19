import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import { assignDefaultRole } from '../iam/assign-default-role';
import type { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';

const INCLUDE = { user: { select: SAFE_USER_FIELDS } } as const;
const DETAIL_INCLUDE = {
  user: { select: SAFE_USER_FIELDS },
  classSubjects: {
    include: { subject: true, class: true, timetableSlots: true },
  },
} as const;

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.teacher.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const teacher = await this.prisma.client.teacher.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async create(dto: CreateTeacherDto) {
    const passwordHash = await argon2.hash(dto.password);

    // Both writes land in the same DB transaction TenantMiddleware already opened
    // for this request, so a failure on either one rolls back both — no extra
    // $transaction() needed here.
    const user = await this.prisma.client.user.create({
      data: { email: dto.email, phone: dto.phone, passwordHash },
    });
    await assignDefaultRole(this.prisma, user.id, 'Teacher');

    return this.prisma.client.teacher.create({
      data: {
        userId: user.id,
        employeeNumber: dto.employeeNumber,
        hireDate: new Date(dto.hireDate),
        employmentType: dto.employmentType,
        department: dto.department,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.get(id);

    if (dto.phone !== undefined) {
      await this.prisma.client.user.update({ where: { id: teacher.userId }, data: { phone: dto.phone } });
    }

    return this.prisma.client.teacher.update({
      where: { id },
      data: { employmentType: dto.employmentType, department: dto.department },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    // Soft-delete: suspend the login rather than hard-delete the User, since
    // historical records (grades entered, homework created) may still reference it.
    const teacher = await this.get(id);
    await this.prisma.client.user.update({ where: { id: teacher.userId }, data: { status: 'SUSPENDED' } });
  }
}
