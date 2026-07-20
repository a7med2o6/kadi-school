ALTER TABLE "fee_structures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_structures" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_fee_structures ON "fee_structures"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_invoices ON "invoices"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_payments ON "payments"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "payroll_structures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll_structures" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_payroll_structures ON "payroll_structures"
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "payslips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payslips" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_payslips ON "payslips"
  USING (school_id = current_setting('app.current_school_id', true));
