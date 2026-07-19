ALTER TABLE "student_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_grades" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_student_grades ON "student_grades"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_assignments ON "assignments"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "assignment_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_submissions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_assignment_submissions ON "assignment_submissions"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_questions ON "questions"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exams" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_exams ON "exams"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "exam_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_questions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_exam_questions ON "exam_questions"
  USING (school_id = current_setting('app.current_school_id', true));
