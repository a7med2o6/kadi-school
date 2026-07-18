ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_refresh_tokens ON "refresh_tokens"
  USING (school_id = current_setting('app.current_school_id', true));