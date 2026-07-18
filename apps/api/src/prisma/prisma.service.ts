import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenancyContext } from '../tenancy/tenancy-context';
import { tenantScopingExtension } from '../tenancy/tenant-scoping.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Base client extended with tenant-scoping (layer 2). Extensions propagate into `$transaction` callbacks. */
  private readonly scoped = this.$extends(tenantScopingExtension);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** The client to use inside request handlers: the active transaction if one is open, else the scoped base client. */
  get client() {
    return TenancyContext.get()?.tx ?? this.scoped;
  }

  /**
   * Resolves `schoolSlug` to a tenant, opens a DB transaction, sets the Postgres RLS
   * session var for it (layer 3), and runs `callback` with tenant context available.
   * Committing/rolling back the transaction automatically resets the session var —
   * no risk of it leaking to another request on a pooled connection.
   */
  async withTenant<T>(schoolSlug: string, callback: () => Promise<T>): Promise<T> {
    return this.scoped.$transaction(async (tx) => {
      const school = await tx.school.findUnique({ where: { slug: schoolSlug } });
      if (!school) {
        throw new NotFoundException(`Unknown school: ${schoolSlug}`);
      }

      await tx.$executeRaw`SELECT set_config('app.current_school_id', ${school.id}, true)`;

      return TenancyContext.runAsync({ schoolId: school.id, schoolSlug: school.slug, tx }, callback);
    });
  }
}
