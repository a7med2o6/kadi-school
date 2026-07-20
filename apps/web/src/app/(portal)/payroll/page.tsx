'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Plus, Trash2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';

type PayslipStatus = 'DRAFT' | 'FINALIZED' | 'PAID';

interface TeacherOption {
  id: string;
  user: { email: string | null };
}
interface PayrollStructure {
  id: string;
  baseSalary: string;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  effectiveFrom: string;
  teacher: TeacherOption;
}
interface Payslip {
  id: string;
  periodMonth: string;
  gross: string;
  net: string;
  status: PayslipStatus;
  payrollStructure: PayrollStructure;
}

interface AmountRow {
  key: string;
  label: string;
  amount: string;
}

const structureSchema = z.object({
  teacherId: z.string().uuid('Select a teacher'),
  baseSalary: z.coerce.number().positive('Must be positive'),
  effectiveFrom: z.string().min(1, 'Required'),
});
type StructureInput = z.infer<typeof structureSchema>;

const generateSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
});
type GenerateInput = z.infer<typeof generateSchema>;

function newRow(): AmountRow {
  return { key: crypto.randomUUID(), label: '', amount: '' };
}

function rowsToMap(rows: AmountRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const label = row.label.trim();
    const amount = Number(row.amount);
    if (label && !Number.isNaN(amount)) map[label] = amount;
  }
  return map;
}

export default function PayrollPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('payroll:write');
  const [subTab, setSubTab] = useState<'structures' | 'payslips'>('structures');
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [allowanceRows, setAllowanceRows] = useState<AmountRow[]>([newRow()]);
  const [deductionRows, setDeductionRows] = useState<AmountRow[]>([newRow()]);

  const structuresQuery = useQuery({
    queryKey: ['payroll-structures'],
    queryFn: () => apiClient.get<PayrollStructure[]>('/payroll/structures'),
  });
  const payslipsQuery = useQuery({
    queryKey: ['payslips'],
    queryFn: () => apiClient.get<Payslip[]>('/payroll/payslips'),
  });
  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: () => apiClient.get<TeacherOption[]>('/teachers'),
    enabled: canWrite,
  });

  const {
    register: registerStructure,
    handleSubmit: handleStructureSubmit,
    reset: resetStructureForm,
    formState: { errors: structureErrors },
  } = useForm<StructureInput>({ resolver: zodResolver(structureSchema) });

  const {
    register: registerGenerate,
    handleSubmit: handleGenerateSubmit,
    formState: { errors: generateErrors },
  } = useForm<GenerateInput>({
    resolver: zodResolver(generateSchema),
    defaultValues: { periodMonth: new Date().toISOString().slice(0, 7) },
  });

  const createStructure = useMutation({
    mutationFn: (data: StructureInput) =>
      apiClient.post('/payroll/structures', {
        ...data,
        allowances: rowsToMap(allowanceRows),
        deductions: rowsToMap(deductionRows),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-structures'] });
      setStructureDialogOpen(false);
      resetStructureForm();
      setAllowanceRows([newRow()]);
      setDeductionRows([newRow()]);
    },
  });

  const generatePayslips = useMutation({
    mutationFn: (data: GenerateInput) => apiClient.post('/payroll/payslips/generate', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslips'] }),
  });

  const updatePayslipStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PayslipStatus }) =>
      apiClient.patch(`/payroll/payslips/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslips'] }),
  });

  const STATUS_BADGE: Record<PayslipStatus, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    FINALIZED: 'bg-primary/10 text-primary',
    PAID: 'bg-success/10 text-success',
  };
  const STATUS_LABEL: Record<PayslipStatus, string> = {
    DRAFT: t.payroll.statusDraft,
    FINALIZED: t.payroll.statusFinalized,
    PAID: t.payroll.statusPaid,
  };

  function updateRow(rows: AmountRow[], setRows: (r: AmountRow[]) => void, id: string, field: 'label' | 'amount', value: string) {
    setRows(rows.map((r) => (r.key === id ? { ...r, [field]: value } : r)));
  }

  function AmountRowsEditor({
    label,
    rows,
    setRows,
  }: {
    label: string;
    rows: AmountRow[];
    setRows: (r: AmountRow[]) => void;
  }) {
    return (
      <div className="mb-md">
        <div className="mb-1 text-sm font-medium text-foreground">{label}</div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(e) => updateRow(rows, setRows, row.key, 'label', e.target.value)}
                placeholder={t.common.optional}
                className={inputClass}
              />
              <input
                value={row.amount}
                onChange={(e) => updateRow(rows, setRows, row.key, 'amount', e.target.value)}
                type="number"
                step="0.01"
                dir="ltr"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                className="shrink-0 cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={t.common.delete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows([...rows, newRow()])}
          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.common.add}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.payroll.title}</h1>
          <p className="text-sm text-muted-foreground">{t.payroll.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-lg border-b border-border">
        <button
          type="button"
          onClick={() => setSubTab('structures')}
          className={`cursor-pointer border-b-2 pb-sm text-sm font-medium transition-colors ${
            subTab === 'structures' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.payroll.tabStructures}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('payslips')}
          className={`cursor-pointer border-b-2 pb-sm text-sm font-medium transition-colors ${
            subTab === 'payslips' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.payroll.tabPayslips}
        </button>
      </div>

      {subTab === 'structures' && (
        <div className="space-y-lg">
          {canWrite && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetStructureForm({ teacherId: '', baseSalary: undefined, effectiveFrom: '' });
                  setAllowanceRows([newRow()]);
                  setDeductionRows([newRow()]);
                  setStructureDialogOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t.payroll.addStructure}
              </button>
            </div>
          )}

          {structuresQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

          {!structuresQuery.isLoading && (structuresQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.payroll.noStructuresYet}</p>
          ) : (
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {(structuresQuery.data ?? []).map((ps) => (
                <div key={ps.id} className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <div className="mb-md flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Banknote className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{ps.teacher.user.email}</h3>
                  <p className="mb-md text-sm text-muted-foreground" dir="ltr">
                    {parseFloat(ps.baseSalary).toFixed(2)}
                  </p>
                  {Object.keys(ps.allowances).length > 0 && (
                    <div className="mb-1 text-xs text-muted-foreground">
                      {t.payroll.allowancesLabel}: {Object.entries(ps.allowances).map(([k, v]) => `${k} ${v}`).join(', ')}
                    </div>
                  )}
                  {Object.keys(ps.deductions).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {t.payroll.deductionsLabel}: {Object.entries(ps.deductions).map(([k, v]) => `${k} ${v}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'payslips' && (
        <div className="space-y-lg">
          {canWrite && (
            <form
              onSubmit={handleGenerateSubmit((data) => generatePayslips.mutate(data))}
              className="flex flex-wrap items-end gap-sm rounded-lg border border-border bg-card p-lg shadow-ambient"
            >
              <FormField
                label={t.payroll.periodMonthLabel}
                htmlFor="periodMonth"
                error={generateErrors.periodMonth?.message}
              >
                <input id="periodMonth" type="month" className={inputClass} dir="ltr" {...registerGenerate('periodMonth')} />
              </FormField>
              <button
                type="submit"
                disabled={generatePayslips.isPending}
                className="mb-md inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {generatePayslips.isPending ? t.common.creating : t.payroll.generatePayslips}
              </button>
            </form>
          )}

          {payslipsQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

          {!payslipsQuery.isLoading && (payslipsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.payroll.noPayslipsYet}</p>
          ) : (
            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.payroll.teacherLabel}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.payroll.periodMonthLabel}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.payroll.grossCol}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.payroll.netCol}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.users.status}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payslipsQuery.data ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="whitespace-nowrap px-md py-sm text-foreground">{p.payrollStructure.teacher.user.email}</td>
                        <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                          {p.periodMonth}
                        </td>
                        <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                          {parseFloat(p.gross).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-md py-sm font-medium text-foreground" dir="ltr">
                          {parseFloat(p.net).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-md py-sm">
                          <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-md py-sm">
                          {canWrite && p.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => updatePayslipStatus.mutate({ id: p.id, status: 'FINALIZED' })}
                              className="cursor-pointer rounded border border-border px-sm py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                            >
                              {t.payroll.markFinalized}
                            </button>
                          )}
                          {canWrite && p.status === 'FINALIZED' && (
                            <button
                              type="button"
                              onClick={() => updatePayslipStatus.mutate({ id: p.id, status: 'PAID' })}
                              className="cursor-pointer rounded border border-border px-sm py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                            >
                              {t.payroll.markPaid}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={structureDialogOpen} onClose={() => setStructureDialogOpen(false)} title={t.payroll.addStructure}>
        <form
          onSubmit={handleStructureSubmit((data) => {
            createStructure.mutate(data);
          })}
        >
          <FormField label={t.payroll.teacherLabel} htmlFor="structureTeacherId" error={structureErrors.teacherId?.message}>
            <select id="structureTeacherId" className={inputClass} {...registerStructure('teacherId')}>
              <option value="">…</option>
              {teachersQuery.data?.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.user.email}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t.payroll.baseSalaryLabel} htmlFor="structureBaseSalary" error={structureErrors.baseSalary?.message}>
            <input id="structureBaseSalary" type="number" step="0.01" className={inputClass} dir="ltr" {...registerStructure('baseSalary')} />
          </FormField>
          <FormField label={t.payroll.effectiveFromLabel} htmlFor="structureEffectiveFrom" error={structureErrors.effectiveFrom?.message}>
            <input id="structureEffectiveFrom" type="date" className={inputClass} dir="ltr" {...registerStructure('effectiveFrom')} />
          </FormField>

          <AmountRowsEditor label={t.payroll.allowancesLabel} rows={allowanceRows} setRows={setAllowanceRows} />
          <AmountRowsEditor label={t.payroll.deductionsLabel} rows={deductionRows} setRows={setDeductionRows} />

          {createStructure.isError && (
            <p className="mb-md text-sm text-destructive">
              {createStructure.error instanceof ApiError ? createStructure.error.message : 'Something went wrong'}
            </p>
          )}
          <button
            type="submit"
            disabled={createStructure.isPending}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {createStructure.isPending ? t.common.creating : t.common.create}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
