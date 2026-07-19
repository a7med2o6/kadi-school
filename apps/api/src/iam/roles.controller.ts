import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('users:read')
  list() {
    // Default roles are platform-shared templates (schoolId: null), so this
    // deliberately bypasses the tenant-scoping extension (`this.prisma.role`,
    // not `this.prisma.client.role`) the same way school onboarding does —
    // the scoped client would inject the current schoolId and find nothing.
    return this.prisma.role.findMany({
      where: { schoolId: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
