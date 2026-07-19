'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Download, FileText, GraduationCap, Printer, ReceiptText, TrendingUp } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';
import { useLocaleStore } from '@/stores/locale-store';
import { hasPermission } from '@/stores/auth-store';

interface Guardian {
  relationship: string;
  isPrimaryContact: boolean;
  parent: { user: { email: string | null; phone: string | null } };
}
interface StudentDetail {
  id: string;
  admissionNumber: string;
  status: string;
  dateOfBirth: string | null;
  gender: string | null;
  enrollmentDate: string;
  class: { name: string } | null;
  user: { email: string | null; civilId: string | null; phone: string | null };
  guardians: Guardian[];
}

type AttendanceStatusValue = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatusValue;
  arrivalTime: string | null;
  note: string | null;
}
interface AttendanceNote {
  id: string;
  body: string;
  createdAt: string;
  authorUser: { email: string | null } | null;
}

const TABS = ['overview', 'grades', 'attendance', 'fees', 'documents'] as const;
type Tab = (typeof TABS)[number];

const STATUS_DOT: Record<AttendanceStatusValue, string> = {
  PRESENT: 'bg-success/15 text-success',
  LATE: 'bg-tertiary/15 text-tertiary',
  ABSENT: 'bg-destructive/15 text-destructive',
  EXCUSED: 'bg-secondary/15 text-secondary',
};

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), year: y, monthIndex: m - 1 };
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [noteBody, setNoteBody] = useState('');
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const canWrite = hasPermission('attendance:write');

  const { data: student, isLoading } = useQuery({
    queryKey: ['students', params.id],
    queryFn: () => apiClient.get<StudentDetail>(`/students/${params.id}`),
  });

  const { start, end } = monthRange(reportMonth);
  const attendanceQuery = useQuery({
    queryKey: ['attendance-students', params.id, reportMonth],
    queryFn: () => apiClient.get<AttendanceRecord[]>(`/attendance/students?studentId=${params.id}&from=${start}&to=${end}`),
    enabled: !!params.id,
  });
  const notesQuery = useQuery({
    queryKey: ['attendance-notes', params.id],
    queryFn: () => apiClient.get<AttendanceNote[]>(`/attendance/notes?studentId=${params.id}`),
    enabled: !!params.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: (body: string) => apiClient.post('/attendance/notes', { studentId: params.id, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-notes', params.id] });
      setNoteBody('');
    },
  });

  const records = attendanceQuery.data ?? [];
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const lateDays = records.filter((r) => r.status === 'LATE').length;
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const schoolDays = records.length;
  const attendanceRate = schoolDays > 0 ? Math.round(((presentDays + lateDays) / schoolDays) * 100) : null;

  if (isLoading || !student) {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
  }

  const label = student.user.email ?? student.user.civilId ?? student.admissionNumber;
  const primaryGuardian = student.guardians.find((g) => g.isPrimaryContact) ?? student.guardians[0];
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  const TAB_LABELS: Record<Tab, string> = {
    overview: t.studentDetail.tabOverview,
    grades: t.studentDetail.tabGrades,
    attendance: t.studentDetail.tabAttendance,
    fees: t.studentDetail.tabFees,
    documents: t.studentDetail.tabDocuments,
  };

  return (
    <div className="space-y-lg">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/students" className="hover:text-foreground">
          {t.studentDetail.breadcrumb}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="font-medium text-foreground">{label}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-md rounded-lg border border-border bg-card p-lg shadow-ambient">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
          {initials(label)}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{label}</h1>
            <span
              className={`rounded-full px-sm py-0.5 text-xs font-medium ${
                student.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {student.status === 'ACTIVE' ? t.common.active : student.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-md text-sm text-muted-foreground">
            <span>{student.admissionNumber}</span>
            <span>{student.class?.name ?? t.students.unassigned}</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          title={t.common.comingSoon}
          className="cursor-not-allowed rounded border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
        >
          {t.studentDetail.editProfile}
        </button>
      </div>

      <div className="flex gap-lg border-b border-border">
        {TABS.map((tb) => (
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

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
          <div className="space-y-lg lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.studentDetail.personalInfo}
              </h2>
              <dl className="space-y-sm text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.studentDetail.dob}</dt>
                  <dd className="font-medium text-foreground">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString(dateLocale) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.studentDetail.gender}</dt>
                  <dd className="font-medium capitalize text-foreground">{student.gender ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.students.civilId}</dt>
                  <dd className="font-medium text-foreground">{student.user.civilId ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.studentDetail.enrolled}</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(student.enrollmentDate).toLocaleDateString(dateLocale)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.studentDetail.guardianInfo}
              </h2>
              {primaryGuardian ? (
                <div>
                  <div className="mb-sm flex items-center gap-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tertiary/10 text-xs font-semibold text-tertiary">
                      {initials(primaryGuardian.parent.user.email ?? '?')}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">{primaryGuardian.parent.user.email}</div>
                      <div className="text-xs capitalize text-muted-foreground">{primaryGuardian.relationship}</div>
                    </div>
                  </div>
                  {primaryGuardian.parent.user.phone && (
                    <div className="rounded border border-border px-sm py-1.5 text-sm text-foreground" dir="ltr">
                      {primaryGuardian.parent.user.phone}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.students.noGuardian}</p>
              )}
            </div>
          </div>

          <div className="space-y-lg lg:col-span-2">
            <div className="grid grid-cols-2 gap-md">
              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.studentDetail.gpaScore}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">{t.studentDetail.gpaPlaceholder}</p>
              </div>
              <button
                type="button"
                onClick={() => setTab('attendance')}
                className="cursor-pointer rounded-lg border border-border bg-card p-lg text-start shadow-ambient transition-colors hover:bg-accent"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.studentDetail.attendance}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceRate !== null ? t.attendanceReport.title : t.studentDetail.attendancePlaceholder}
                </p>
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.studentDetail.activityTimeline}
              </h2>
              <div className="flex items-start gap-sm text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-foreground">
                    {student.class
                      ? interpolate(t.studentDetail.enrolledInClass, { class: student.class.name })
                      : t.studentDetail.enrolled}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(student.enrollmentDate).toLocaleDateString(dateLocale)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'grades' && <EmptyTab icon={TrendingUp} message={t.studentDetail.gradesEmpty} />}

      {tab === 'attendance' && (
        <div className="space-y-lg">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              dir="ltr"
            />
            <div className="flex gap-sm">
              <button
                type="button"
                disabled
                title={t.common.comingSoon}
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
              >
                <Download className="h-4 w-4" />
                {t.attendanceReport.downloadPdf}
              </button>
              <button
                type="button"
                disabled
                title={t.common.comingSoon}
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
              >
                <Printer className="h-4 w-4" />
                {t.attendanceReport.printReport}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md lg:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-primary">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.attendanceRate}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-tertiary">{lateDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.lateDays}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-destructive">{absentDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.absentDays}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-success">{presentDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.presentDays}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-foreground">{schoolDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.schoolDays}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
            <div className="space-y-lg lg:col-span-1">
              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <h3 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.attendanceReport.legendTitle}
                </h3>
                <ul className="space-y-sm text-sm">
                  {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatusValue[]).map((s) => (
                    <li key={s} className="flex items-start gap-sm">
                      <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${STATUS_DOT[s]}`} />
                      <div>
                        <div className="font-medium text-foreground">{t.attendanceStatus[s]}</div>
                        <div className="text-xs text-muted-foreground">
                          {s === 'PRESENT' && t.attendanceReport.legendPresentDesc}
                          {s === 'ABSENT' && t.attendanceReport.legendAbsentDesc}
                          {s === 'LATE' && t.attendanceReport.legendLateDesc}
                          {s === 'EXCUSED' && t.attendanceReport.legendExcusedDesc}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <h3 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.attendanceReport.supervisorNotes}
                </h3>
                {canWrite && (
                  <div className="mb-md flex gap-sm">
                    <input
                      type="text"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder={t.attendanceReport.addNotePlaceholder}
                      className="flex-1 rounded-md border border-input bg-background px-sm py-1.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <button
                      type="button"
                      disabled={!noteBody.trim() || addNoteMutation.isPending}
                      onClick={() => addNoteMutation.mutate(noteBody.trim())}
                      className="cursor-pointer rounded-md bg-primary px-md py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t.attendanceReport.postNote}
                    </button>
                  </div>
                )}
                {addNoteMutation.isError && (
                  <p className="mb-sm text-sm text-destructive">
                    {addNoteMutation.error instanceof ApiError ? addNoteMutation.error.message : 'Something went wrong'}
                  </p>
                )}
                {!notesQuery.data || notesQuery.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.attendanceReport.noNotesYet}</p>
                ) : (
                  <ul className="space-y-sm">
                    {notesQuery.data.slice(0, 3).map((n) => (
                      <li key={n.id} className="flex items-start gap-sm">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(n.authorUser?.email ?? '?')}
                        </span>
                        <div>
                          <p className="text-sm text-foreground">{n.body}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.authorUser?.email} · {new Date(n.createdAt).toLocaleDateString(dateLocale)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <MonthCalendar month={reportMonth} records={records} dayLabels={t.timetable.shortDays} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
            <h3 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t.attendanceReport.detailedLog}
            </h3>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.attendanceReport.noRecordsYet}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceReport.logDate}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceReport.logDay}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.status}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceReport.logArrival}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.notes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...records]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                            {r.date.slice(0, 10)}
                          </td>
                          <td className="whitespace-nowrap px-md py-sm text-foreground">
                            {t.timetable.days[new Date(r.date).getUTCDay()]}
                          </td>
                          <td className="whitespace-nowrap px-md py-sm">
                            <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${STATUS_DOT[r.status]}`}>
                              {t.attendanceStatus[r.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                            {r.arrivalTime ?? '—'}
                          </td>
                          <td className="px-md py-sm text-foreground">{r.note ?? '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">{t.attendanceReport.generatedFooter}</p>
        </div>
      )}

      {tab === 'fees' && <EmptyTab icon={ReceiptText} message={t.studentDetail.feesEmpty} />}
      {tab === 'documents' && <EmptyTab icon={FileText} message={t.studentDetail.documentsEmpty} />}
    </div>
  );
}

function MonthCalendar({
  month,
  records,
  dayLabels,
}: {
  month: string;
  records: AttendanceRecord[];
  dayLabels: string[];
}) {
  const { year, monthIndex } = monthRange(month);
  const byDate = new Map(records.map((r) => [r.date.slice(0, 10), r]));
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();

  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
      <div className="mb-sm grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {dayLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = byDate.get(dateStr);
          return (
            <div
              key={dateStr}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-xs ${
                record ? STATUS_DOT[record.status] : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="font-medium">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyTab({ icon: Icon, message }: { icon: typeof TrendingUp; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3xl text-center shadow-ambient">
      <span className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
