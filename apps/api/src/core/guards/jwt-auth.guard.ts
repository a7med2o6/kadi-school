import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyContext } from '../../tenancy/tenancy-context';
import type { AccessTokenPayload } from '../../iam/jwt-payload';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global guard (registered as APP_GUARD): fails closed by default, every route
 * requires a valid access token unless marked @Public(). Also checks the token's
 * schoolId against the tenant already resolved from the subdomain by
 * TenantMiddleware — a token minted for school-a is rejected on school-b's
 * subdomain even if it hasn't expired, per ARCHITECTURE.md's "JWT claim" layer.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const tenant = TenancyContext.get();
    if (!tenant || tenant.schoolId !== payload.schoolId) {
      throw new UnauthorizedException('Token does not belong to this school');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User no longer active');
    }

    const roles = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
    const permissions = Array.from(
      new Set<string>(
        user.userRoles.flatMap((ur: { role: { rolePermissions: { permission: { key: string } }[] } }) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    );

    request.user = {
      id: user.id,
      schoolId: user.schoolId,
      schoolSlug: tenant.schoolSlug,
      email: user.email,
      civilId: user.civilId,
      roles,
      permissions,
    };

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length);
  }
}
