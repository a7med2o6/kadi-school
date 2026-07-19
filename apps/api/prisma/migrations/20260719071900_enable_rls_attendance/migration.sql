ALTER TABLE "student_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_attendance" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_student_attendance ON "student_attendance"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "teacher_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_attendance" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_teacher_attendance ON "teacher_attendance"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "teacher_leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_leave_requests" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_teacher_leave_requests ON "teacher_leave_requests"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "student_attendance_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_attendance_notes" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_student_attendance_notes ON "student_attendance_notes"
  USING (school_id = current_setting('app.current_school_id', true));
