ALTER TABLE "timetable_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timetable_slots" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_timetable_slots ON "timetable_slots"
  USING (school_id = current_setting('app.current_school_id', true));