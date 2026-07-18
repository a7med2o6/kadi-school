import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { SuperAdminTokenPayload } from './super-admin-payload';

export interface AuthenticatedSuperAdmin {
  id: string;
  email: string;
  name: string;
}

/**
 * Deliberately separate from JwtAuthGuard: Super Admin tokens are signed with a
 * different secret and carry no schoolId, so they can never be confused with (or
 * accidentally accepted as) a regular tenant-scoped access token. Routes using
 * this guard must also be marked @Public() to skip the global JwtAuthGuard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { superAdmin: AuthenticatedSuperAdmin }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }

    let payload: SuperAdminTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<SuperAdminTokenPayload>(header.slice('Bearer '.length), {
        secret: process.env.SUPER_ADMIN_JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.realm !== 'super-admin') {
      throw new UnauthorizedException('Not a super-admin token');
    }

    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id: payload.sub } });
    if (!superAdmin) {
      throw new UnauthorizedException('Super admin no longer exists');
    }

    request.superAdmin = { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name };
    return true;
  }
}
