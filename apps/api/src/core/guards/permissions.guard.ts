import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

/** Runs after JwtAuthGuard (which populates request.user). No-op if the route has no @RequirePermission(). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!request.user?.permissions.includes(required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }

    return true;
  }
}
