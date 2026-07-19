import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import { assignDefaultRole } from '../iam/assign-default-role';
import type { CreateParentDto, UpdateParentDto } from './dto/parent.dto';

const INCLUDE = {
  user: { select: SAFE_USER_FIELDS },
  students: { include: { student: { include: { user: { select: SAFE_USER_FIELDS } } } } },
} as const;

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.parent.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const parent = await this.prisma.client.parent.findUnique({ where: { id }, include: INCLUDE });
    if (!parent) throw new NotFoundException('Parent not found');
    return parent;
  }

  async listChildrenForUser(userId: string) {
    const parent = await this.prisma.client.parent.findUnique({ where: { userId } });
    if (!parent) throw new NotFoundException('Parent not found');

    const links = await this.prisma.client.studentGuardian.findMany({
      where: { parentId: parent.id },
      include: { student: { include: { user: { select: SAFE_USER_FIELDS }, class: true } } },
    });
    return links.map((link: (typeof links)[number]) => ({
      ...link.student,
      relationship: link.relationship,
      isPrimaryContact: link.isPrimaryContact,
    }));
  }

  async create(dto: CreateParentDto) {
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.client.user.create({
      data: { email: dto.email, phone: dto.phone, passwordHash },
    });
    await assignDefaultRole(this.prisma, user.id, 'Parent');

    return this.prisma.client.parent.create({
      data: { userId: user.id, occupation: dto.occupation },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateParentDto) {
    const parent = await this.get(id);

    if (dto.phone !== undefined) {
      await this.prisma.client.user.update({ where: { id: parent.userId }, data: { phone: dto.phone } });
    }

    return this.prisma.client.parent.update({
      where: { id },
      data: { occupation: dto.occupation },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    const parent = await this.get(id);
    await this.prisma.client.user.update({ where: { id: parent.userId }, data: { status: 'SUSPENDED' } });
  }
}
