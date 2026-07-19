import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../core/types/authenticated-user';

/**
 * Staff holding students:read can view any student in the school. Everyone else
 * (Student/Parent self-service) may only view their own record or a linked child's —
 * callers filtering by studentId must prove ownership even though they hold the
 * underlying module :read permission (e.g. attendance:read), since that permission
 * alone doesn't scope *which* student they're allowed to see.
 */
export async function assertCanAccessStudent(
  prisma: PrismaService,
  user: AuthenticatedUser,
  studentId: string,
): Promise<void> {
  if (user.permissions.includes('students:read')) return;

  const student = await prisma.client.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (student?.userId === user.id) return;

  const guardianLink = await prisma.client.studentGuardian.findFirst({
    where: { studentId, parent: { userId: user.id } },
  });
  if (guardianLink) return;

  throw new ForbiddenException('Not authorized to view this student');
}
