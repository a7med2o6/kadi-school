import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('users:read')
  async list() {
    return this.prisma.client.user.findMany({
      select: { id: true, email: true, civilId: true, status: true, lastLoginAt: true },
    });
  }
}
