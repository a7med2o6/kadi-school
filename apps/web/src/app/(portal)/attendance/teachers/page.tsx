'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X as XIcon } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';

type TeacherStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
const STATUSES: TeacherStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'];

interface Teacher {
  id: string;
  department: string | null;
  user: { email: string | null };
}
interface TeacherAttendanceRow {
  id: string;
  teacherId: string;
  date: string;
  status: TeacherStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  note: string | null;
  teacher: Teacher;
}
interface LeaveRequest {
  id: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacher: Teacher;
}

const upsertSchema = z.object({
  teacherId: z.string().uuid('Select a teacher'),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE']),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  note: z.string().optional(),
});
type UpsertInput = z.infer<typeof upsertSchema>;

const leaveSchema = z.object({
  teacherId: z.string().uuid('Select a teacher'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
  reason: z.string().optional(),
});
type LeaveInput = z.infer<typeof leaveSchema>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function hoursBetween(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) return '—';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export default function TeacherAttendancePage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('teacher-attendance:write');
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => apiClient.get<Teacher[]>('/teachers') });
  const attendanceQuery = useQuery({
    queryKey: ['attendance-teachers', date],
    queryFn: () => apiClient.get<TeacherAttendanceRow[]>(`/attendance/teachers?date=${date}`),
  });
  const weekQuery = useQuery({
    queryKey: ['attendance-teachers-week'],
    queryFn: () => {
      const to = new Date();
      const from = new Date(Date.now() - 6 * 86400000);
      return apiClient.get<TeacherAttendanceRow[]>(
        `/attendance/teachers?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`,
      );
    },
  });
  const leaveRequestsQuery = useQuery({
    queryKey: ['leave-requests', 'PENDING'],
    queryFn: () => apiClient.get<LeaveRequest[]>('/leave-requests?status=PENDING'),
  });

  const departments = useMemo(
    () => Array.from(new Set((teachersQuery.data ?? []).map((t2) => t2.department).filter(Boolean))) as string[],
    [teachersQuery.data],
  );

  const byTeacherId = useMemo(() => new Map((attendanceQuery.data ?? []).map((r) => [r.teacherId, r])), [attendanceQuery.data]);

  const rows = useMemo(() => {
    const teachers = teachersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return teachers
      .filter((tc) => !department || tc.department === department)
      .filter((tc) => {
        const record = byTeacherId.get(tc.id);
        return !status || record?.status === status || (!record && status === 'ABSENT');
      })
      .filter((tc) => !q || `${tc.user.email ?? ''} ${tc.department ?? ''}`.toLowerCase().includes(q))
      .map((tc) => ({ teacher: tc, record: byTeacherId.get(tc.id) ?? null }));
  }, [teachersQuery.data, byTeacherId, department, status, search]);

  const presentNow = (attendanceQuery.data ?? []).filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const totalTeachers = teachersQuery.data?.length ?? 0;
  const todayRate = totalTeachers > 0 ? Math.round((presentNow / totalTeachers) * 100) : 0;
  const lateThisMorning = (attendanceQuery.data ?? []).filter((r) => r.status === 'LATE').length;
  const onLeaveCount = (attendanceQuery.data ?? []).filter((r) => r.status === 'ON_LEAVE').length;

  const departmentStats = useMemo(() => {
    return departments.map((dept) => {
      const deptTeachers = (teachersQuery.data ?? []).filter((tc) => tc.department === dept);
      const present = deptTeachers.filter((tc) => {
        const r = byTeacherId.get(tc.id);
        return r?.status === 'PRESENT' || r?.status === 'LATE';
      }).length;
      const pct = deptTeachers.length > 0 ? Math.round((present / deptTeachers.length) * 100) : 0;
      return { dept, pct };
    });
  }, [departments, teachersQuery.data, byTeacherId]);

  const weeklyByDay = useMemo(() => {
    const days: { date: string; onTime: number; late: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const dayRows = (weekQuery.data ?? []).filter((r) => r.date.slice(0, 10) === d);
      days.push({
        date: d,
        onTime: dayRows.filter((r) => r.status === 'PRESENT').length,
        late: dayRows.filter((r) => r.status === 'LATE').length,
      });
    }
    return days;
  }, [weekQuery.data]);
  const maxDayCount = Math.max(1, ...weeklyByDay.map((d) => d.onTime + d.late));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpsertInput>({ resolver: zodResolver(upsertSchema), defaultValues: { status: 'PRESENT' } });

  const upsertMutation = useMutation({
    mutationFn: (data: UpsertInput) => apiClient.post('/attendance/teachers/upsert', { ...data, date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-teachers', date] });
      queryClient.invalidateQueries({ queryKey: ['attendance-teachers-week'] });
      setEntryDialogOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const {
    register: registerLeave,
    handleSubmit: handleSubmitLeave,
    reset: resetLeave,
    formState: { errors: leaveErrors, isSubmitting: isSubmittingLeave },
  } = useForm<LeaveInput>({ resolver: zodResolver(leaveSchema) });

  const createLeaveMutation = useMutation({
    mutationFn: (data: LeaveInput) => apiClient.post('/leave-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'PENDING'] });
      setLeaveDialogOpen(false);
      resetLeave();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      apiClient.patch(`/leave-requests/${id}`, { status: decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'PENDING'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-teachers', date] });
    },
  });

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.attendanceTeachers.title}</h1>
          <p className="text-sm text-muted-foreground">{t.attendanceTeachers.subtitle}</p>
        </div>
        {canWrite && (
          <div className="flex gap-sm">
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setLeaveDialogOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t.attendanceTeachers.requestLeave}
            </button>
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setEntryDialogOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {t.attendanceTeachers.manualEntry}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: t.attendanceTeachers.totalTeachers, value: totalTeachers },
          { label: t.attendanceTeachers.presentNow, value: presentNow },
          { label: t.attendanceTeachers.todayRate, value: `${todayRate}%` },
          { label: t.attendanceTeachers.lateThisMorning, value: lateThisMorning },
          { label: t.attendanceTeachers.onLeave, value: onLeaveCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-md shadow-ambient">
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`max-w-xs ${inputClass}`}>
          <option value="">{t.attendanceTeachers.allDepartments}</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`max-w-xs ${inputClass}`}>
          <option value="">{t.attendanceTeachers.allStatuses}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.attendanceStatus[s]}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.attendanceTeachers.searchPlaceholder}
          className={`max-w-xs ${inputClass}`}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceTeachers.teacherName}</th>
              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.teachers.department}</th>
              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.status}</th>
              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceTeachers.checkIn}</th>
              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceTeachers.checkOut}</th>
              <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceTeachers.totalHours}</th>
            </tr>
          </thead>
          <tbody>
            {teachersQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-md py-md text-muted-foreground">
                  {t.common.loading}
                </td>
              </tr>
            )}
            {!teachersQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-md py-md text-muted-foreground">
                  {t.attendanceTeachers.noRecordsForDate}
                </td>
              </tr>
            )}
            {rows.map(({ teacher, record }) => {
              const label = teacher.user.email ?? '—';
              return (
                <tr key={teacher.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-md py-sm">
                    <div className="flex items-center gap-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
                        {initials(label)}
                      </span>
                      <span className="font-medium text-foreground">{label}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-md py-sm text-muted-foreground">{teacher.department ?? '—'}</td>
                  <td className="whitespace-nowrap px-md py-sm">
                    {record ? (
                      <span
                        className={`rounded-full px-sm py-0.5 text-xs font-medium ${
                          record.status === 'PRESENT'
                            ? 'bg-success/10 text-success'
                            : record.status === 'LATE'
                              ? 'bg-tertiary/10 text-tertiary'
                              : record.status === 'ON_LEAVE'
                                ? 'bg-secondary/10 text-secondary'
                                : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {record.checkOutTime ? t.attendanceTeachers.departed : t.attendanceStatus[record.status]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-destructive/10 px-sm py-0.5 text-xs font-medium text-destructive">
                        {t.attendanceStatus.ABSENT}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                    {record?.checkInTime ?? '—:—'}
                  </td>
                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                    {record?.checkOutTime ?? '—:—'}
                  </td>
                  <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                    {hoursBetween(record?.checkInTime ?? null, record?.checkOutTime ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leaveRequestsQuery.data && leaveRequestsQuery.data.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-lg font-bold text-foreground">
            {t.attendanceTeachers.pendingRequests} ({leaveRequestsQuery.data.length})
          </h2>
          <ul className="space-y-sm">
            {leaveRequestsQuery.data.map((lr) => (
              <li key={lr.id} className="flex flex-wrap items-center justify-between gap-sm rounded-md border border-border px-md py-sm text-sm">
                <div>
                  <div className="font-medium text-foreground">{lr.teacher.user.email}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {lr.startDate.slice(0, 10)} → {lr.endDate.slice(0, 10)} {lr.reason ? `· ${lr.reason}` : ''}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => decideMutation.mutate({ id: lr.id, decision: 'APPROVED' })}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-success/10 px-sm py-1 text-xs font-medium text-success transition-colors hover:bg-success/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t.attendanceTeachers.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => decideMutation.mutate({ id: lr.id, decision: 'REJECTED' })}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-destructive/10 px-sm py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      {t.attendanceTeachers.reject}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-lg font-bold text-foreground">{t.attendanceTeachers.departmentBreakdown}</h2>
          {departmentStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.attendance.noTrendData}</p>
          ) : (
            <div className="space-y-sm">
              {departmentStats.map((d) => (
                <div key={d.dept}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">{d.dept}</span>
                    <span className="font-medium text-foreground">{d.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-lg font-bold text-foreground">{t.attendanceTeachers.weeklyStats}</h2>
          <div className="mb-sm flex items-center gap-md text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {t.attendanceTeachers.earlyArrival}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-tertiary" />
              {t.attendanceTeachers.lateArrival}
            </span>
          </div>
          <div className="flex h-32 items-end gap-2">
            {weeklyByDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t">
                  <div
                    className="w-full bg-tertiary"
                    style={{ height: `${(d.late / maxDayCount) * 100}%` }}
                  />
                  <div
                    className="w-full bg-primary"
                    style={{ height: `${(d.onTime / maxDayCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {t.timetable.shortDays[new Date(d.date).getUTCDay()]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={entryDialogOpen} onClose={() => setEntryDialogOpen(false)} title={t.attendanceTeachers.manualEntry}>
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            upsertMutation.mutate(data);
          })}
        >
          <FormField label={t.attendanceTeachers.selectTeacher} htmlFor="teacherId" error={errors.teacherId?.message}>
            <select id="teacherId" className={inputClass} {...register('teacherId')}>
              <option value="">…</option>
              {teachersQuery.data?.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.user.email}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.attendanceRegister.status} htmlFor="status">
            <select id="status" className={inputClass} {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.attendanceStatus[s]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.attendanceTeachers.checkIn} htmlFor="checkInTime">
            <input id="checkInTime" type="time" className={inputClass} dir="ltr" {...register('checkInTime')} />
          </FormField>

          <FormField label={t.attendanceTeachers.checkOut} htmlFor="checkOutTime">
            <input id="checkOutTime" type="time" className={inputClass} dir="ltr" {...register('checkOutTime')} />
          </FormField>

          <FormField label={`${t.attendanceRegister.notes} (${t.common.optional})`} htmlFor="note">
            <input id="note" className={inputClass} {...register('note')} />
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t.common.creating : t.common.save}
          </button>
        </form>
      </Dialog>

      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} title={t.attendanceTeachers.newLeaveRequest}>
        <form
          onSubmit={handleSubmitLeave((data) => {
            setServerError(null);
            createLeaveMutation.mutate(data);
          })}
        >
          <FormField label={t.attendanceTeachers.selectTeacher} htmlFor="leaveTeacherId" error={leaveErrors.teacherId?.message}>
            <select id="leaveTeacherId" className={inputClass} {...registerLeave('teacherId')}>
              <option value="">…</option>
              {teachersQuery.data?.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.user.email}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.attendanceTeachers.startDate} htmlFor="startDate" error={leaveErrors.startDate?.message}>
            <input id="startDate" type="date" className={inputClass} {...registerLeave('startDate')} />
          </FormField>

          <FormField label={t.attendanceTeachers.endDate} htmlFor="endDate" error={leaveErrors.endDate?.message}>
            <input id="endDate" type="date" className={inputClass} {...registerLeave('endDate')} />
          </FormField>

          <FormField label={`${t.attendanceTeachers.reason} (${t.common.optional})`} htmlFor="reason">
            <input id="reason" className={inputClass} {...registerLeave('reason')} />
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmittingLeave}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmittingLeave ? t.common.creating : t.attendanceTeachers.submit}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
