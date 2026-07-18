import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const RESERVED_SUBDOMAINS = new Set(['localhost', 'www', 'admin', 'api']);

/**
 * `{slug}.kadischool.app` -> "slug". Bare hosts (localhost, apex domain, www)
 * and reserved platform subdomains (admin, api) resolve to no tenant, so
 * platform-level routes (health checks, Super Admin, marketing) can run
 * without a school in scope — and can never collide with a real school slug.
 */
function extractSchoolSlug(hostname: string): string | null {
  const labels = hostname.split('.');
  if (labels.length < 2) return null;
  const [first] = labels;
  if (RESERVED_SUBDOMAINS.has(first)) return null;
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
