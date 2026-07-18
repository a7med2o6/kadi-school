import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `{slug}.kadischool.app` -> "slug". Bare hosts (localhost, apex domain, www)
 * resolve to no tenant, so platform-level routes (health checks, Super Admin,
 * marketing) can run without a school in scope.
 */
function extractSchoolSlug(hostname: string): string | null {
  const labels = hostname.split('.');
  if (labels.length < 2) return null;
  const [first] = labels;
  if (first === 'localhost' || first === 'www') return null;
  return first;
}

/**
 * Deliberately a middleware, not an interceptor: establishing AsyncLocalStorage
 * context needs `next()` called synchronously so Express dispatches the rest
 * of the pipeline nested within that same call frame, which is more reliably
 * true of plain Express middleware than of Nest's RxJS-based interceptor chain.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const slug = extractSchoolSlug(req.hostname);
    if (!slug) {
      next();
      return;
    }

    this.prisma
      .withTenant(
        slug,
        () =>
          new Promise<void>((resolve) => {
            res.once('finish', resolve);
            res.once('close', resolve);
            next();
          }),
      )
      .catch(next);
  }
}
