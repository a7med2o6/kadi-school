import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyContext } from './tenancy-context';

/**
 * Diagnostic endpoint for Phase 0's tenant-isolation proof — not a real feature.
 * Exercises the full path: TenantMiddleware -> withTenant -> RLS session var -> Prisma extension.
 */
@Controller('tenancy-check')
export class TenancyCheckController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  async users() {
    const { schoolId, schoolSlug } = TenancyContext.require();
    const users = await this.prisma.client.user.findMany({ select: { id: true, email: true, schoolId: true } });
    return { schoolSlug, schoolId, users };
  }
}
