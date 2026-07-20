'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useLocaleStore } from '@/stores/locale-store';

type Frequency = 'MONTHLY' | 'TERM' | 'ANNUAL';
type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

interface SchoolClass {
  id: string;
  name: string;
}
interface AcademicYear {
  id: string;
  name: string;
}
interface StudentOption {
  id: string;
  admissionNumber: string;
  user: { email: string | null };
}
interface FeeStructure {
  id: string;
  name: string;
  amount: string;
  frequency: Frequency;
  class: SchoolClass | null;
  academicYear: AcademicYear | null;
}
interface InvoicePayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  referenceNumber: string | null;
}
interface Invoice {
  id: string;
  title: string;
  amountDue: string;
  dueDate: string;
  status: InvoiceStatus;
  student: StudentOption;
  feeStructure: FeeStructure | null;
  payments: InvoicePayment[];
}

const feeStructureSchema = z.object({
  name: z.string().min(1, 'Required'),
  classId: z.string().optional(),
  amount: z.coerce.number().positive('Must be positive'),
  frequency: z.enum(['MONTHLY', 'TERM', 'ANNUAL']),
  academicYearId: z.string().optional(),
});
type FeeStructureInput = z.infer<typeof feeStructureSchema>;

const invoiceSchema = z.object({
  studentId: z.string().uuid('Select a student'),
  feeStructureId: z.string().optional(),
  title: z.string().min(1, 'Required'),
  amountDue: z.coerce.number().positive('Must be positive'),
  dueDate: z.string().min(1, 'Required'),
});
type InvoiceInput = z.infer<typeof invoiceSchema>;

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  referenceNumber: z.string().optional(),
});
type PaymentInput = z.infer<typeof paymentSchema>;

export default function FinancePage() {
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
  const queryClient = useQueryClient();
  const canWrite = hasPermission('finance:write');
  const [subTab, setSubTab] = useState<'structures' | 'invoices'>('invoices');
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);

  const structuresQuery = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => apiClient.get<FeeStructure[]>('/fee-structures'),
  });
  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiClient.get<Invoice[]>('/invoices'),
  });
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiClient.get<SchoolClass[]>('/classes'),
    enabled: canWrite,
  });
  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => apiClient.get<AcademicYear[]>('/academic-years'),
    enabled: canWrite,
  });
  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => apiClient.get<StudentOption[]>('/students'),
    enabled: canWrite,
  });

  const {
    register: registerStructure,
    handleSubmit: handleStructureSubmit,
    reset: resetStructureForm,
    formState: { errors: structureErrors },
  } = useForm<FeeStructureInput>({ resolver: zodResolver(feeStructureSchema) });

  const {
    register: registerInvoice,
    handleSubmit: handleInvoiceSubmit,
    reset: resetInvoiceForm,
    formState: { errors: invoiceErrors },
  } = useForm<InvoiceInput>({ resolver: zodResolver(invoiceSchema) });

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPaymentForm,
    formState: { errors: paymentErrors },
  } = useForm<PaymentInput>({ resolver: zodResolver(paymentSchema), defaultValues: { method: 'CASH' } });

  const createStructure = useMutation({
    mutationFn: (data: FeeStructureInput) =>
      apiClient.post('/fee-structures', { ...data, classId: data.classId || undefined, academicYearId: data.academicYearId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setStructureDialogOpen(false);
      resetStructureForm();
    },
  });

  const createInvoice = useMutation({
    mutationFn: (data: InvoiceInput) =>
      apiClient.post('/invoices', { ...data, feeStructureId: data.feeStructureId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setInvoiceDialogOpen(false);
      resetInvoiceForm();
    },
  });

  const addPayment = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: PaymentInput }) =>
      apiClient.post(`/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPayInvoiceId(null);
      resetPaymentForm({ amount: undefined, method: 'CASH', referenceNumber: '' });
    },
  });

  const invoices = invoicesQuery.data ?? [];
  const invoicePaidTotal = (inv: Invoice) => inv.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== 'PAID')
    .reduce((sum, inv) => sum + (parseFloat(inv.amountDue) - invoicePaidTotal(inv)), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + invoicePaidTotal(inv), 0);
  const payingInvoice = invoices.find((inv) => inv.id === payInvoiceId) ?? null;

  const FREQUENCY_LABEL: Record<Frequency, string> = {
    MONTHLY: t.finance.frequencyMonthly,
    TERM: t.finance.frequencyTerm,
    ANNUAL: t.finance.frequencyAnnual,
  };
  const STATUS_BADGE: Record<InvoiceStatus, string> = {
    PENDING: 'bg-tertiary/10 text-tertiary',
    PARTIAL: 'bg-primary/10 text-primary',
    PAID: 'bg-success/10 text-success',
    OVERDUE: 'bg-destructive/10 text-destructive',
  };
  const STATUS_LABEL: Record<InvoiceStatus, string> = {
    PENDING: t.finance.statusPending,
    PARTIAL: t.finance.statusPartial,
    PAID: t.finance.statusPaid,
    OVERDUE: t.finance.statusOverdue,
  };
  const METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: t.finance.methodCash,
    BANK_TRANSFER: t.finance.methodBankTransfer,
    CARD: t.finance.methodCard,
    OTHER: t.finance.methodOther,
  };

  function studentLabel(s: StudentOption) {
    return `${s.admissionNumber} · ${s.user.email ?? ''}`;
  }

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.finance.title}</h1>
          <p className="text-sm text-muted-foreground">{t.finance.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-md sm:max-w-md">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-xs text-muted-foreground">{t.finance.totalOutstanding}</div>
          <div className="text-2xl font-bold text-foreground" dir="ltr">
            {totalOutstanding.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-xs text-muted-foreground">{t.finance.totalCollected}</div>
          <div className="text-2xl font-bold text-success" dir="ltr">
            {totalCollected.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex gap-lg border-b border-border">
        <button
          type="button"
          onClick={() => setSubTab('invoices')}
          className={`cursor-pointer border-b-2 pb-sm text-sm font-medium transition-colors ${
            subTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.finance.tabInvoices}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('structures')}
          className={`cursor-pointer border-b-2 pb-sm text-sm font-medium transition-colors ${
            subTab === 'structures' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.finance.tabFeeStructures}
        </button>
      </div>

      {subTab === 'structures' && (
        <div className="space-y-lg">
          {canWrite && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetStructureForm({ name: '', classId: '', amount: undefined, frequency: 'MONTHLY', academicYearId: '' });
                  setStructureDialogOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t.finance.addFeeStructure}
              </button>
            </div>
          )}

          {structuresQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

          {!structuresQuery.isLoading && (structuresQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.finance.noFeeStructuresYet}</p>
          ) : (
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {(structuresQuery.data ?? []).map((fs) => (
                <div key={fs.id} className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <div className="mb-md flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-muted px-sm py-0.5 text-xs font-medium text-muted-foreground">
                      {FREQUENCY_LABEL[fs.frequency]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{fs.name}</h3>
                  <p className="mb-md text-sm text-muted-foreground">
                    {fs.class ? fs.class.name : t.finance.allClasses}
                    {fs.academicYear ? ` · ${fs.academicYear.name}` : ''}
                  </p>
                  <div className="text-xl font-bold text-foreground" dir="ltr">
                    {parseFloat(fs.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'invoices' && (
        <div className="space-y-lg">
          {canWrite && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetInvoiceForm({ studentId: '', feeStructureId: '', title: '', amountDue: undefined, dueDate: '' });
                  setInvoiceDialogOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t.finance.addInvoice}
              </button>
            </div>
          )}

          {invoicesQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

          {!invoicesQuery.isLoading && invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.finance.noInvoicesYet}</p>
          ) : (
            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.finance.studentCol}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.finance.invoiceTitleLabel}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.finance.amount}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.finance.dueDateLabel}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.users.status}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <td className="whitespace-nowrap px-md py-sm text-foreground">{studentLabel(inv.student)}</td>
                        <td className="whitespace-nowrap px-md py-sm font-medium text-foreground">{inv.title}</td>
                        <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                          {parseFloat(inv.amountDue).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                          {new Date(inv.dueDate).toLocaleDateString(dateLocale)}
                        </td>
                        <td className="whitespace-nowrap px-md py-sm">
                          <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
                            {STATUS_LABEL[inv.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-md py-sm">
                          {canWrite && inv.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => {
                                resetPaymentForm({ amount: undefined, method: 'CASH', referenceNumber: '' });
                                setPayInvoiceId(inv.id);
                              }}
                              className="cursor-pointer rounded border border-border px-sm py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                            >
                              {t.finance.recordPayment}
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

      <Dialog open={structureDialogOpen} onClose={() => setStructureDialogOpen(false)} title={t.finance.addFeeStructure}>
        <form
          onSubmit={handleStructureSubmit((data) => {
            createStructure.mutate(data);
          })}
        >
          <FormField label={t.finance.structureName} htmlFor="structureName" error={structureErrors.name?.message}>
            <input id="structureName" className={inputClass} {...registerStructure('name')} />
          </FormField>
          <FormField label={t.finance.amount} htmlFor="structureAmount" error={structureErrors.amount?.message}>
            <input id="structureAmount" type="number" step="0.01" className={inputClass} dir="ltr" {...registerStructure('amount')} />
          </FormField>
          <FormField label={t.finance.frequency} htmlFor="structureFrequency">
            <select id="structureFrequency" className={inputClass} {...registerStructure('frequency')}>
              <option value="MONTHLY">{t.finance.frequencyMonthly}</option>
              <option value="TERM">{t.finance.frequencyTerm}</option>
              <option value="ANNUAL">{t.finance.frequencyAnnual}</option>
            </select>
          </FormField>
          <FormField label={t.finance.forClass} htmlFor="structureClassId">
            <select id="structureClassId" className={inputClass} {...registerStructure('classId')}>
              <option value="">{t.finance.allClasses}</option>
              {classesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={`${t.classes.academicYear} (${t.common.optional})`} htmlFor="structureYearId">
            <select id="structureYearId" className={inputClass} {...registerStructure('academicYearId')}>
              <option value="">…</option>
              {yearsQuery.data?.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </FormField>
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

      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} title={t.finance.addInvoice}>
        <form
          onSubmit={handleInvoiceSubmit((data) => {
            createInvoice.mutate(data);
          })}
        >
          <FormField label={t.finance.selectStudent} htmlFor="invoiceStudentId" error={invoiceErrors.studentId?.message}>
            <select id="invoiceStudentId" className={inputClass} {...registerInvoice('studentId')}>
              <option value="">…</option>
              {studentsQuery.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentLabel(s)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={`${t.finance.tabFeeStructures} (${t.common.optional})`} htmlFor="invoiceFeeStructureId">
            <select id="invoiceFeeStructureId" className={inputClass} {...registerInvoice('feeStructureId')}>
              <option value="">…</option>
              {structuresQuery.data?.map((fs) => (
                <option key={fs.id} value={fs.id}>
                  {fs.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t.finance.invoiceTitleLabel} htmlFor="invoiceTitle" error={invoiceErrors.title?.message}>
            <input id="invoiceTitle" className={inputClass} {...registerInvoice('title')} />
          </FormField>
          <FormField label={t.finance.amount} htmlFor="invoiceAmountDue" error={invoiceErrors.amountDue?.message}>
            <input id="invoiceAmountDue" type="number" step="0.01" className={inputClass} dir="ltr" {...registerInvoice('amountDue')} />
          </FormField>
          <FormField label={t.finance.dueDateLabel} htmlFor="invoiceDueDate" error={invoiceErrors.dueDate?.message}>
            <input id="invoiceDueDate" type="date" className={inputClass} dir="ltr" {...registerInvoice('dueDate')} />
          </FormField>
          {createInvoice.isError && (
            <p className="mb-md text-sm text-destructive">
              {createInvoice.error instanceof ApiError ? createInvoice.error.message : 'Something went wrong'}
            </p>
          )}
          <button
            type="submit"
            disabled={createInvoice.isPending}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {createInvoice.isPending ? t.common.creating : t.common.create}
          </button>
        </form>
      </Dialog>

      <Dialog open={!!payInvoiceId} onClose={() => setPayInvoiceId(null)} title={t.finance.recordPayment}>
        {payingInvoice && (
          <>
            <div className="mb-md rounded-md bg-muted p-sm">
              <div className="text-sm font-medium text-foreground">{payingInvoice.title}</div>
              <div className="text-xs text-muted-foreground">{t.finance.paymentHistory}</div>
              {payingInvoice.payments.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">{t.finance.noPaymentsYet}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {payingInvoice.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-xs text-foreground">
                      <span>
                        {METHOD_LABEL[p.method]} · {new Date(p.paidAt).toLocaleDateString(dateLocale)}
                      </span>
                      <span dir="ltr">{parseFloat(p.amount).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form
              onSubmit={handlePaymentSubmit((data) => {
                addPayment.mutate({ invoiceId: payingInvoice.id, data });
              })}
            >
              <FormField label={t.finance.paymentAmountLabel} htmlFor="feePaymentAmount" error={paymentErrors.amount?.message}>
                <input id="feePaymentAmount" type="number" step="0.01" className={inputClass} dir="ltr" {...registerPayment('amount')} />
              </FormField>
              <FormField label={t.finance.paymentMethodLabel} htmlFor="feePaymentMethod">
                <select id="feePaymentMethod" className={inputClass} {...registerPayment('method')}>
                  <option value="CASH">{t.finance.methodCash}</option>
                  <option value="BANK_TRANSFER">{t.finance.methodBankTransfer}</option>
                  <option value="CARD">{t.finance.methodCard}</option>
                  <option value="OTHER">{t.finance.methodOther}</option>
                </select>
              </FormField>
              <FormField label={t.finance.referenceNumberLabel} htmlFor="feePaymentReference">
                <input id="feePaymentReference" className={inputClass} {...registerPayment('referenceNumber')} />
              </FormField>
              {addPayment.isError && (
                <p className="mb-md text-sm text-destructive">
                  {addPayment.error instanceof ApiError ? addPayment.error.message : 'Something went wrong'}
                </p>
              )}
              <button
                type="submit"
                disabled={addPayment.isPending}
                className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {addPayment.isPending ? t.common.creating : t.finance.recordPayment}
              </button>
            </form>
          </>
        )}
      </Dialog>
    </div>
  );
}
