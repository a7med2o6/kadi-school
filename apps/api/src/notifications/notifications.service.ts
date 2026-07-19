import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { CreateNotificationDto } from './dto/notification.dto';

const SENT_INCLUDE = {
  createdByUser: { select: SAFE_USER_FIELDS },
  targetClass: true,
  _count: { select: { recipients: true } },
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.notification.findMany({
      include: SENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateNotificationDto, createdByUserId: string) {
    const recipientUserIds = await this.resolveRecipients(dto);
    if (recipientUserIds.length === 0) {
      throw new BadRequestException('No recipients matched this target');
    }

    const notification = await this.prisma.client.notification.create({
      data: {
        title: dto.title,
        body: dto.body,
        targetType: dto.targetType,
        targetRoleId: dto.targetRoleId,
        targetClassId: dto.targetClassId,
        targetUserId: dto.targetUserId,
        createdByUserId,
      },
    });

    // Top-level createMany, not a nested `recipients: { create: [...] }` —
    // the tenant-scoping extension only intercepts top-level model
    // operations, so a nested create would skip schoolId injection on
    // NotificationRecipient. Shares the request's one open transaction.
    await this.prisma.client.notificationRecipient.createMany({
      data: recipientUserIds.map((userId) => ({ notificationId: notification.id, userId })),
    });

    const created = await this.prisma.client.notification.findUnique({
      where: { id: notification.id },
      include: SENT_INCLUDE,
    });
    if (!created) throw new NotFoundException('Notification not found');
    return created;
  }

  inbox(userId: string) {
    return this.prisma.client.notificationRecipient.findMany({
      where: { userId },
      include: { notification: { include: { createdByUser: { select: SAFE_USER_FIELDS } } } },
      orderBy: { notification: { createdAt: 'desc' } },
    });
  }

  unreadCount(userId: string) {
    return this.prisma.client.notificationRecipient.count({ where: { userId, readAt: null } });
  }

  async markRead(notificationId: string, userId: string) {
    const result = await this.prisma.client.notificationRecipient.updateMany({
      where: { notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.client.notificationRecipient.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private async resolveRecipients(dto: CreateNotificationDto): Promise<string[]> {
    if (dto.targetType === 'INDIVIDUAL') {
      return dto.targetUserId ? [dto.targetUserId] : [];
    }

    if (dto.targetType === 'ROLE') {
      const users = await this.prisma.client.user.findMany({
        where: { userRoles: { some: { roleId: dto.targetRoleId } } },
        select: { id: true },
      });
      return users.map((u: { id: string }) => u.id);
    }

    // CLASS: every enrolled student plus their linked guardians.
    const students = await this.prisma.client.student.findMany({
      where: { classId: dto.targetClassId },
      select: { userId: true, guardians: { select: { parent: { select: { userId: true } } } } },
    });
    const ids = new Set<string>();
    for (const s of students as { userId: string; guardians: { parent: { userId: string } }[] }[]) {
      ids.add(s.userId);
      for (const g of s.guardians) ids.add(g.parent.userId);
    }
    return Array.from(ids);
  }
}
