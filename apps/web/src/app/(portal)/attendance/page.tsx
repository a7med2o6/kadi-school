'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarPlus, FileBarChart, GraduationCap, Phone, UserCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';

interface SchoolClass {
  id: string;
  name: string;
}
interface Guardian {
  parent: { user: { phone: string | null } };
}
interface Student {
  id: string;
  admissionNumber: string;
  class: SchoolClass | null;
  user: { email: string | null; civilId: string | null };
  guardians: Guardian[];
}
interface Teacher {
  id: string;
}
interface StudentAttendanceRow {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
}
interface TeacherAttendanceRow {
  id: string;
  date: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AttendanceDashboardPage() {
  const t = useTranslations();
  const [trendMode, setTrendMode] = useState<'daily' | 'weekly'>('daily');
  const today = toISODate(new Date());
  const rangeStart = toISODate(new Date(Date.now() - 41 * 86400000));

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => apiClient.get<SchoolClass[]>('/classes') });
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });
  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => apiClient.get<Teacher[]>('/teachers') });

  const todayStudentAttendanceQuery = useQuery({
    queryKey: ['attendance-students-today', today],
    queryFn: () => apiClient.get<StudentAttendanceRow[]>(`/attendance/students?date=${today}`),
  });
  const todayTeacherAttendanceQuery = useQuery({
    queryKey: ['attendance-teachers-today', today],
    queryFn: () => apiClient.get<TeacherAttendanceRow[]>(`/attendance/teachers?date=${today}`),
  });
  const rangeStudentAttendanceQuery = useQuery({
    queryKey: ['attendance-students-range', rangeStart, today],
    queryFn: () => apiClient.get<StudentAttendanceRow[]>(`/attendance/students?from=${rangeStart}&to=${today}`),
  });

  const todayRecords = useMemo(() => todayStudentAttendanceQuery.data ?? [], [todayStudentAttendanceQuery.data]);
  const excusedCount = todayRecords.filter((r) => r.status === 'EXCUSED').length;
  const lateCount = todayRecords.filter((r) => r.status === 'LATE').length;

  const totalStudentsWithClass = (studentsQuery.data ?? []).filter((s) => s.class).length;
  const presentStudentsToday = todayRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const studentRate = totalStudentsWithClass > 0 ? Math.round((presentStudentsToday / totalStudentsWithClass) * 100) : 0;

  const totalTeachers = teachersQuery.data?.length ?? 0;
  const presentTeachersToday = (todayTeacherAttendanceQuery.data ?? []).filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE',
  ).length;
  const teacherRate = totalTeachers > 0 ? Math.round((presentTeachersToday / totalTeachers) * 100) : 0;

  const classesRecordedToday = new Set(todayRecords.map((r) => r.classId)).size;
  const totalClasses = classesQuery.data?.length ?? 0;
  const recordedPct = totalClasses > 0 ? Math.round((classesRecordedToday / totalClasses) * 100) : 0;

  const recentAbsences = useMemo(() => {
    const markedToday = new Set(todayRecords.map((r) => r.studentId));
    return (studentsQuery.data ?? [])
      .filter((s) => s.class && !markedToday.has(s.id))
      .slice(0, 5);
  }, [studentsQuery.data, todayRecords]);

  const trendBuckets = useMemo(() => {
    const records = rangeStudentAttendanceQuery.data ?? [];
    if (trendMode === 'daily') {
      const days: { key: string; label: string; rate: number | null }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = toISODate(new Date(Date.now() - i * 86400000));
        const dayRecords = records.filter((r) => r.date.slice(0, 10) === d);
        const present = dayRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
        days.push({
          key: d,
          label: t.timetable.shortDays[new Date(d).getUTCDay()],
          rate: dayRecords.length > 0 ? Math.round((present / dayRecords.length) * 100) : null,
        });
      }
      return days;
    }
    const weeks: { key: string; label: string; rate: number | null }[] = [];
    for (let w = 5; w >= 0; w--) {
      const weekStart = new Date(Date.now() - (w * 7 + 6) * 86400000);
      const weekEnd = new Date(Date.now() - w * 7 * 86400000);
      const weekRecords = records.filter((r) => {
        const d = new Date(r.date);
        return d >= weekStart && d <= weekEnd;
      });
      const present = weekRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      weeks.push({
        key: toISODate(weekStart),
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        rate: weekRecords.length > 0 ? Math.round((present / weekRecords.length) * 100) : null,
      });
    }
    return weeks;
  }, [rangeStudentAttendanceQuery.data, trendMode, t]);

  const hasTrendData = trendBuckets.some((b) => b.rate !== null);
  const canWriteStudents = hasPermission('attendance:write');
  const canWriteTeachers = hasPermission('teacher-attendance:write');

  const quickActions = [
    canWriteTeachers && {
      href: '/attendance/teachers',
      icon: CalendarPlus,
      label: t.attendance.quickLeaveRequest,
      desc: t.attendance.quickLeaveRequestDesc,
    },
    { href: '/attendance/register', icon: FileBarChart, label: t.attendance.quickReports, desc: t.attendance.quickReportsDesc },
    canWriteStudents && {
      href: '/attendance/register',
      icon: UserCheck,
      label: t.attendance.quickBulkRecord,
      desc: t.attendance.quickBulkRecordDesc,
    },
  ].filter(Boolean) as { href: string; icon: typeof CalendarPlus; label: string; desc: string }[];

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.attendance.title}</h1>
        <p className="text-sm text-muted-foreground">{t.attendance.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-md rounded-lg border border-border bg-card p-lg shadow-ambient transition-colors hover:bg-accent"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <action.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold text-foreground">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <span className="mb-2 inline-block rounded-full bg-secondary/10 px-sm py-0.5 text-xs font-medium text-secondary">
            {t.attendanceStatus.EXCUSED}
          </span>
          <div className="text-2xl font-bold text-foreground">{String(excusedCount).padStart(2, '0')}</div>
          <div className="text-xs text-muted-foreground">{t.attendance.statExcused}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <span className="mb-2 inline-block rounded-full bg-tertiary/10 px-sm py-0.5 text-xs font-medium text-tertiary">
            {t.attendanceStatus.LATE}
          </span>
          <div className="text-2xl font-bold text-foreground">{String(lateCount).padStart(2, '0')}</div>
          <div className="text-xs text-muted-foreground">{t.attendance.statLate}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-4 w-4" />
          </span>
          <div className="text-2xl font-bold text-foreground">{totalTeachers > 0 ? `${teacherRate}%` : '—'}</div>
          <div className="text-xs text-muted-foreground">{t.attendance.statTeacherRate}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="text-2xl font-bold text-foreground">{totalStudentsWithClass > 0 ? `${studentRate}%` : '—'}</div>
          <div className="text-xs text-muted-foreground">{t.attendance.statStudentRate}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="text-lg font-bold text-foreground">{t.attendance.recentAbsences}</h2>
          <p className="mb-md text-sm text-muted-foreground">{t.attendance.recentAbsencesDesc}</p>
          {recentAbsences.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.attendance.noAbsencesToday}</p>
          ) : (
            <ul className="space-y-sm">
              {recentAbsences.map((s) => {
                const label = s.user.email ?? s.user.civilId ?? s.admissionNumber;
                const phone = s.guardians[0]?.parent.user.phone;
                return (
                  <li key={s.id} className="flex items-center gap-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive">
                      {label.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{label}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.class?.name}</div>
                    </div>
                    {phone && (
                      <a href={`tel:${phone}`} className="text-primary" aria-label={`Call ${phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/attendance/register" className="mt-md inline-block text-sm text-primary hover:underline">
            {t.attendance.viewAllAbsences}
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{t.attendance.trends}</h2>
            <div className="flex overflow-hidden rounded-md border border-border text-xs">
              <button
                type="button"
                onClick={() => setTrendMode('daily')}
                className={`cursor-pointer px-sm py-1 transition-colors ${trendMode === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {t.attendance.daily}
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('weekly')}
                className={`cursor-pointer px-sm py-1 transition-colors ${trendMode === 'weekly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {t.attendance.weekly}
              </button>
            </div>
          </div>
          <p className="mb-md text-sm text-muted-foreground">{t.attendance.trendsDesc}</p>
          {!hasTrendData ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
              <BarChart3 className="mb-2 h-8 w-8" />
              <p className="text-sm">{t.attendance.noTrendData}</p>
            </div>
          ) : (
            <div className="flex h-40 items-end gap-2">
              {trendBuckets.map((b) => (
                <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-foreground">{b.rate !== null ? `${b.rate}%` : ''}</span>
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${Math.max(4, b.rate ?? 0)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canWriteStudents && (
        <div className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div>
            <h2 className="font-semibold text-foreground">{t.attendance.readyToRecord}</h2>
            <p className="text-sm text-muted-foreground">
              {interpolate(t.attendance.readyToRecordDesc, { percent: recordedPct })}
            </p>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              disabled
              title={t.common.comingSoon}
              className="cursor-not-allowed rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
            >
              {t.attendance.remindTeachers}
            </button>
            <Link
              href="/attendance/register"
              className="rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              {t.attendance.startRecording}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
