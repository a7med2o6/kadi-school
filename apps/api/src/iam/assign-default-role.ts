import { PrismaService } from '../prisma/prisma.service';

/**
 * Links a newly created User to the platform-default Role matching `roleName`
 * (e.g. "Teacher", "Student", "Parent") so their JWT actually carries
 * permissions. The Role lookup goes through the raw client — default roles
 * are global templates with schoolId: null, and the scoped client would
 * inject the current tenant's schoolId and find nothing — but the UserRole
 * write goes through the scoped client so it shares the request's already-open
 * transaction with the User/Teacher/Student/Parent rows it belongs with.
 */
export async function assignDefaultRole(prisma: PrismaService, userId: string, roleName: string): Promise<void> {
  const role = await prisma.role.findFirstOrThrow({ where: { schoolId: null, name: roleName } });
  await prisma.client.userRole.create({ data: { userId, roleId: role.id } });
}
