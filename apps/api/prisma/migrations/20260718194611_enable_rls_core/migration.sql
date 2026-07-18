-- Row-Level Security: last-line-of-defense tenant isolation.
-- Enforced even if the Prisma-layer scoping is ever bypassed (raw SQL, a bug, a migration script).
--
-- FORCE (not just ENABLE) is required because our app connects as the table owner,
-- and Postgres exempts owners from RLS by default unless FORCE is set.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON "users"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;

-- roles.school_id is nullable: NULL = platform default role, visible to every tenant.
CREATE POLICY tenant_isolation_roles ON "roles"
  USING (school_id = current_setting('app.current_school_id', true) OR school_id IS NULL);