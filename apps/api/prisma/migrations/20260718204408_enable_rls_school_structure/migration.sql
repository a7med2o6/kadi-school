-- Row-Level Security for every tenant-scoped table added in Phase 2.
-- FORCE is required because the app connects as the table owner (kadi),
-- and Postgres exempts owners from RLS unless FORCE is set.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'academic_years', 'grade_levels', 'classes', 'subjects', 'class_subjects',
    'teachers', 'students', 'parents', 'student_guardians'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%s ON %I USING (school_id = current_setting(''app.current_school_id'', true))',
      t, t
    );
  END LOOP;
END
$$;