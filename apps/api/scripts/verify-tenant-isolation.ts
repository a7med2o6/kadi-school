/**
 * Phase 0 proof: seed two fake schools, then prove a request scoped to one
 * can never observe the other's data — at both the Prisma layer (app-level
 * scoping) and the Postgres layer (RLS), independently of each other.
 *
 * Run: pnpm --filter @kadi/api verify:tenant-isolation
 * Requires: `pnpm prisma:migrate` and `pnpm prisma:seed` already run.
 */
import 'reflect-metadata';
import { Client as PgClient } from 'pg';
import type { User } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenancyContext } from '../src/tenancy/tenancy-context';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ISOLATION PROOF FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function main() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  // `schools` carries no RLS (it's the global tenant registry), so these reads work
  // on the plain app connection with no tenant context needed.
  const schoolA = await prisma.school.findUniqueOrThrow({ where: { slug: 'school-a' } });
  const schoolB = await prisma.school.findUniqueOrThrow({ where: { slug: 'school-b' } });

  // The app's own DB role (kadi_app) is non-superuser and RLS-bound, same as in
  // production — so even fetching school-b's user id for this test has to go
  // through school-b's own tenant context, exactly like a real request would.
  const userB: User = await prisma.withTenant('school-b', () =>
    TenancyContext.require().tx.user.findFirstOrThrow(),
  );

  console.log('Layer 1+2: tenant middleware context + Prisma extension scoping');

  await prisma.withTenant('school-a', async () => {
    const users = await TenancyContext.require().tx.user.findMany();
    assert(users.length > 0, 'school-a context returns at least one user');
    assert(
      users.every((u: { schoolId: string }) => u.schoolId === schoolA.id),
      'every user returned under school-a context belongs to school-a',
    );

    // Query school-b's user by its exact known ID — the strongest possible cross-tenant
    // probe, since findUnique's `where` combines the unique id with the injected schoolId
    // filter. If scoping worked, this can never match (the row's real schoolId is school-b's).
    const crossTenantLookup = await TenancyContext.require().tx.user.findUnique({
      where: { id: userB.id },
    });
    assert(crossTenantLookup === null, 'school-a context cannot fetch school-b\'s user, even by its exact ID');

    // A same-shape probe using school-b's email — again forced through the schoolId override,
    // so it can only match if a school-a user happens to share that email (it doesn't).
    const crossTenantByEmail = await TenancyContext.require().tx.user.findFirst({
      where: { email: userB.email },
    });
    assert(crossTenantByEmail === null, "school-a context cannot fetch school-b's user by its email");
  });

  await prisma.withTenant('school-b', async () => {
    const users = await TenancyContext.require().tx.user.findMany();
    assert(
      users.every((u: { schoolId: string }) => u.schoolId === schoolB.id),
      'every user returned under school-b context belongs to school-b',
    );
  });

  console.log('\nLayer 3: Postgres Row-Level Security (raw pg connection, Prisma bypassed entirely)');

  const pg = new PgClient({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  try {
    await pg.query('BEGIN');
    await pg.query("SELECT set_config('app.current_school_id', $1, true)", [schoolA.id]);
    const { rows } = await pg.query('SELECT school_id FROM users');
    assert(rows.length > 0, 'raw SQL under school-a RLS session var returns rows at all');
    assert(
      rows.every((r: { school_id: string }) => r.school_id === schoolA.id),
      'raw SQL under school-a RLS session var sees zero school-b rows',
    );
    await pg.query('COMMIT');
  } finally {
    await pg.end();
  }

  console.log('\nTenant isolation proof PASSED — two schools, zero cross-tenant leakage at any layer.');
  await prisma.onModuleDestroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
