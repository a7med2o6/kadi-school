'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { apiClient, downloadAuthenticated } from '@/lib/api-client';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useLocaleStore } from '@/stores/locale-store';

type ReportTab = 'attendance' | 'academic' | 'financial';

interface SchoolClass {
  id: string;
  name: string;
}
interface AttendanceReport {
  summary: { total: number; attendanceRate: number | null; byStatus: Record<string, number> };
  classBreakdown: { className: string; total: number; rate: number }[];
  rows: { date: string; className: string; admissionNumber: string; studentEmail: string | null; status: string }[];
}
interface AcademicReport {
  summary: { studentCount: number; schoolAverage: number | null };
  subjectBreakdown: { subjectName: string; average: number }[];
  rows: { studentEmail: string | null; className: string; subjectName: string; term: string; total: number }[];
}
interface FinancialReport {
  summary: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    byStatus: Record<string, { count: number; amountDue: number }>;
  };
  rows: { studentEmail: string | null; title: string; amountDue: number; paid: number; dueDate: string; status: string }[];
}

function toQueryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export default function ReportsPage() {
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  const canAttendance = hasPermission('attendance:read');
  const canAcademic = hasPermission('grades:read');
  const canFinancial = hasPermission('finance:read');
  const availableTabs: ReportTab[] = [
    ...(canAttendance ? (['attendance'] as const) : []),
    ...(canAcademic ? (['academic'] as const) : []),
    ...(canFinancial ? (['financial'] as const) : []),
  ];

  const [tab, setTab] = useState<ReportTab | null>(availableTabs[0] ?? null);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [term, setTerm] = useState('1');

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiClient.get<SchoolClass[]>('/classes'),
    enabled: canAttendance || canAcademic,
  });

  const attendanceParams = { classId, from, to };
  const academicParams = { classId, term };
  const financialParams = { from, to };

  const attendanceQuery = useQuery({
    queryKey: ['reports', 'attendance', attendanceParams],
    queryFn: () => apiClient.get<AttendanceReport>(`/reports/attendance${toQueryString(attendanceParams)}`),
    enabled: tab === 'attendance',
  });
  const academicQuery = useQuery({
    queryKey: ['reports', 'academic', academicParams],
    queryFn: () => apiClient.get<AcademicReport>(`/reports/academic${toQueryString(academicParams)}`),
    enabled: tab === 'academic',
  });
  const financialQuery = useQuery({
    queryKey: ['reports', 'financial', financialParams],
    queryFn: () => apiClient.get<FinancialReport>(`/reports/financial${toQueryString(financialParams)}`),
    enabled: tab === 'financial',
  });

  function exportCsv() {
    if (tab === 'attendance') {
      downloadAuthenticated(`/reports/attendance/export${toQueryString(attendanceParams)}`, 'attendance-report.csv');
    } else if (tab === 'academic') {
      downloadAuthenticated(`/reports/academic/export${toQueryString(academicParams)}`, 'academic-report.csv');
    } else if (tab === 'financial') {
      downloadAuthenticated(`/reports/financial/export${toQueryString(financialParams)}`, 'financial-report.csv');
    }
  }

  const TAB_LABELS: Record<ReportTab, string> = {
    attendance: t.reports.tabAttendance,
    academic: t.reports.tabAcademic,
    financial: t.reports.tabFinancial,
  };

  const selectClass = 'rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30';

  const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
    PRESENT: t.attendanceStatus.PRESENT,
    LATE: t.attendanceStatus.LATE,
    ABSENT: t.attendanceStatus.ABSENT,
    EXCUSED: t.attendanceStatus.EXCUSED,
  };
  const INVOICE_STATUS_LABEL: Record<string, string> = {
    PENDING: t.finance.statusPending,
    PARTIAL: t.finance.statusPartial,
    PAID: t.finance.statusPaid,
    OVERDUE: t.finance.statusOverdue,
  };

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.reports.title}</h1>
        <p className="text-sm text-muted-foreground">{t.reports.subtitle}</p>
      </div>

      {availableTabs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.reports.noAccessToAnyReport}</p>
      ) : (
        <>
          <div className="no-print flex flex-wrap items-center justify-between gap-md border-b border-border">
            <div className="flex gap-lg">
              {availableTabs.map((tb) => (
                <button
                  key={tb}
                  type="button"
                  onClick={() => setTab(tb)}
                  className={`cursor-pointer border-b-2 pb-sm text-sm font-medium transition-colors ${
                    tab === tb ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TAB_LABELS[tb]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-sm pb-sm">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Download className="h-4 w-4" />
                {t.reports.exportCsv}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Printer className="h-4 w-4" />
                {t.reports.print}
              </button>
            </div>
          </div>

          {tab === 'attendance' && (
            <div className="space-y-lg">
              <div className="no-print flex flex-wrap items-end gap-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterClass}</label>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
                    <option value="">{t.reports.allClasses}</option>
                    {classesQuery.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterFrom}</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className={selectClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterTo}</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className={selectClass} />
                </div>
              </div>

              {attendanceQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

              {attendanceQuery.data && (
                <>
                  <div className="grid grid-cols-2 gap-md sm:max-w-md">
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="text-xs text-muted-foreground">{t.reports.totalRecords}</div>
                      <div className="text-2xl font-bold text-foreground" dir="ltr">
                        {attendanceQuery.data.summary.total}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="text-xs text-muted-foreground">{t.reports.attendanceRate}</div>
                      <div className="text-2xl font-bold text-foreground" dir="ltr">
                        {attendanceQuery.data.summary.attendanceRate ?? '—'}
                        {attendanceQuery.data.summary.attendanceRate !== null && '%'}
                      </div>
                    </div>
                  </div>

                  {attendanceQuery.data.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.reports.noDataYet}</p>
                  ) : (
                    <>
                      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                        <h2 className="mb-md text-sm font-semibold text-foreground">{t.reports.classBreakdown}</h2>
                        <table className="w-full text-start text-sm">
                          <thead className="border-b border-border text-muted-foreground">
                            <tr>
                              <th className="px-md py-sm text-start font-medium">{t.reports.classCol}</th>
                              <th className="px-md py-sm text-start font-medium">{t.reports.totalRecords}</th>
                              <th className="px-md py-sm text-start font-medium">{t.reports.rateCol}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceQuery.data.classBreakdown.map((c) => (
                              <tr key={c.className} className="border-b border-border last:border-0">
                                <td className="px-md py-sm text-foreground">{c.className}</td>
                                <td className="px-md py-sm text-foreground" dir="ltr">
                                  {c.total}
                                </td>
                                <td className="px-md py-sm text-foreground" dir="ltr">
                                  {c.rate}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                        <div className="overflow-x-auto">
                          <table className="w-full text-start text-sm">
                            <thead className="border-b border-border text-muted-foreground">
                              <tr>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.dateCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.classCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">
                                  {t.reports.admissionNumberCol}
                                </th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.studentCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.statusCol}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceQuery.data.rows.map((r, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                    {new Date(r.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground">{r.className}</td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                    {r.admissionNumber}
                                  </td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground">{r.studentEmail}</td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground">{ATTENDANCE_STATUS_LABEL[r.status] ?? r.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'academic' && (
            <div className="space-y-lg">
              <div className="no-print flex flex-wrap items-end gap-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterClass}</label>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
                    <option value="">{t.reports.allClasses}</option>
                    {classesQuery.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterTerm}</label>
                  <select value={term} onChange={(e) => setTerm(e.target.value)} className={selectClass}>
                    <option value="1">{t.grades.term1}</option>
                    <option value="2">{t.grades.term2}</option>
                  </select>
                </div>
              </div>

              {academicQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

              {academicQuery.data && (
                <>
                  <div className="grid grid-cols-2 gap-md sm:max-w-md">
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="text-xs text-muted-foreground">{t.reports.studentCount}</div>
                      <div className="text-2xl font-bold text-foreground" dir="ltr">
                        {academicQuery.data.summary.studentCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="text-xs text-muted-foreground">{t.reports.schoolAverage}</div>
                      <div className="text-2xl font-bold text-foreground" dir="ltr">
                        {academicQuery.data.summary.schoolAverage ?? '—'}
                        {academicQuery.data.summary.schoolAverage !== null && '%'}
                      </div>
                    </div>
                  </div>

                  {academicQuery.data.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.reports.noDataYet}</p>
                  ) : (
                    <>
                      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                        <h2 className="mb-md text-sm font-semibold text-foreground">{t.reports.subjectBreakdown}</h2>
                        <table className="w-full text-start text-sm">
                          <thead className="border-b border-border text-muted-foreground">
                            <tr>
                              <th className="px-md py-sm text-start font-medium">{t.reports.subjectCol}</th>
                              <th className="px-md py-sm text-start font-medium">{t.reports.totalCol}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {academicQuery.data.subjectBreakdown.map((s) => (
                              <tr key={s.subjectName} className="border-b border-border last:border-0">
                                <td className="px-md py-sm text-foreground">{s.subjectName}</td>
                                <td className="px-md py-sm text-foreground" dir="ltr">
                                  {s.average}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                        <div className="overflow-x-auto">
                          <table className="w-full text-start text-sm">
                            <thead className="border-b border-border text-muted-foreground">
                              <tr>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.studentCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.classCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.subjectCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.termCol}</th>
                                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.totalCol}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {academicQuery.data.rows.map((r, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                  <td className="whitespace-nowrap px-md py-sm text-foreground">{r.studentEmail}</td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground">{r.className}</td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground">{r.subjectName}</td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                    {r.term}
                                  </td>
                                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                    {r.total}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'financial' && (
            <div className="space-y-lg">
              <div className="no-print flex flex-wrap items-end gap-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterFrom}</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className={selectClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.reports.filterTo}</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className={selectClass} />
                </div>
              </div>

              {financialQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

              {financialQuery.data && (
                <>
                  <div className="grid grid-cols-2 gap-md sm:max-w-md">
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="text-xs text-muted-foreground">{t.finance.totalOutstanding}</div>
                      <div className="text-2xl font-bold text-foreground" dir="ltr">
                        {financialQuery.data.summary.totalOutstanding.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="text-xs text-muted-foreground">{t.finance.totalCollected}</div>
                      <div className="text-2xl font-bold text-success" dir="ltr">
                        {financialQuery.data.summary.totalCollected.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {financialQuery.data.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.reports.noDataYet}</p>
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-sm">
                          <thead className="border-b border-border text-muted-foreground">
                            <tr>
                              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.studentCol}</th>
                              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.invoiceTitleCol}</th>
                              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.amountDueCol}</th>
                              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.paidCol}</th>
                              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.dueDateCol}</th>
                              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.reports.statusCol}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financialQuery.data.rows.map((r, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="whitespace-nowrap px-md py-sm text-foreground">{r.studentEmail}</td>
                                <td className="whitespace-nowrap px-md py-sm text-foreground">{r.title}</td>
                                <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                  {r.amountDue.toFixed(2)}
                                </td>
                                <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                  {r.paid.toFixed(2)}
                                </td>
                                <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                                  {new Date(r.dueDate).toLocaleDateString(dateLocale)}
                                </td>
                                <td className="whitespace-nowrap px-md py-sm text-foreground">{INVOICE_STATUS_LABEL[r.status] ?? r.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
