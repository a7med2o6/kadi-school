ALTER TABLE "fee_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_invoices" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_fee_invoices ON "fee_invoices"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "student_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_documents" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_student_documents ON "student_documents"
  USING (school_id = current_setting('app.current_school_id', true));
