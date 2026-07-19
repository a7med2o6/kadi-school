ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notifications ON "notifications"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "notification_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_recipients" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notification_recipients ON "notification_recipients"
  USING (school_id = current_setting('app.current_school_id', true));
