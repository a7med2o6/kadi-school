-- Non-superuser role for the running application. `kadi` (POSTGRES_USER) is a
-- superuser by default in the official postgres image, and superusers bypass
-- Row-Level Security unconditionally, even with FORCE ROW LEVEL SECURITY.
-- Migrations still run as `kadi` (needs owner privileges for DDL); the app
-- connects as `kadi_app` so RLS policies actually apply at runtime.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kadi_app') THEN
    CREATE ROLE kadi_app LOGIN PASSWORD 'kadi_app_dev_password';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE kadi_school TO kadi_app;
GRANT USAGE ON SCHEMA public TO kadi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kadi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kadi_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kadi_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kadi_app;
