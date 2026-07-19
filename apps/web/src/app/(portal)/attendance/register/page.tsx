'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Download, Users } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';

type AttendanceStatusValue = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
const STATUSES: AttendanceStatusValue[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

const STATUS_STYLES: Record<AttendanceStatusValue, string> = {
  PRESENT: 'border-success bg-success/10 text-success',
  LATE: 'border-tertiary bg-tertiary/10 text-tertiary',
  ABSENT: 'border-destructive bg-destructive/10 text-destructive',
  EXCUSED: 'border-secondary bg-secondary/10 text-secondary',
};

interface SchoolClass {
  id: string;
  name: string;
}
interface Student {
  id: string;
  admissionNumber: string;
  class: { id: string } | null;
  user: { email: string | null; civilId: string | null };
}
interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatusValue;
  arrivalTime: string | null;
  note: string | null;
  updatedAt: string;
}

interface RowState {
  status: AttendanceStatusValue;
  arrivalTime: string;
  note: string;
}

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function AttendanceRegisterPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('attendance:write');

  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => apiClient.get<SchoolClass[]>('/classes') });
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });

  const activeClassId = classId || classesQuery.data?.[0]?.id || '';
  const roster = useMemo(
    () => (studentsQuery.data ?? []).filter((s) => s.class?.id === activeClassId),
    [studentsQuery.data, activeClassId],
  );

  const attendanceQuery = useQuery({
    queryKey: ['attendance-students', activeClassId, date],
    queryFn: () =>
      apiClient.get<AttendanceRecord[]>(`/attendance/students?classId=${activeClassId}&date=${date}`),
    enabled: !!activeClassId,
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    const byStudent = new Map(attendanceQuery.data.map((r) => [r.studentId, r]));
    const next: Record<string, RowState> = {};
    for (const student of roster) {
      const existing = byStudent.get(student.id);
      next[student.id] = {
        status: existing?.status ?? 'PRESENT',
        arrivalTime: existing?.arrivalTime ?? '',
        note: existing?.note ?? '',
      };
    }
    setRows(next);
  }, [attendanceQuery.data, roster]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/attendance/students/bulk', {
        classId: activeClassId,
        date,
        records: roster.map((s) => ({
          studentId: s.id,
          status: rows[s.id]?.status ?? 'PRESENT',
          arrivalTime: rows[s.id]?.arrivalTime || undefined,
          note: rows[s.id]?.note || undefined,
        })),
      }),
    onSuccess: () => {
      setLastSavedAt(new Date().toLocaleTimeString());
      queryClient.invalidateQueries({ queryKey: ['attendance-students', activeClassId, date] });
    },
  });

  function setRow(studentId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  }

  function markAllPresent() {
    setRows((prev) => {
      const next = { ...prev };
      for (const student of roster) {
        next[student.id] = { ...next[student.id], status: 'PRESENT' };
      }
      return next;
    });
  }

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.attendanceRegister.title}</h1>
          <p className="text-sm text-muted-foreground">{t.attendanceRegister.subtitle}</p>
        </div>
        <button
          type="button"
          disabled
          title={t.common.comingSoon}
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
        >
          <Download className="h-4 w-4" />
          {t.attendanceRegister.exportPdf}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <select value={activeClassId} onChange={(e) => setClassId(e.target.value)} className={`max-w-xs ${inputClass}`}>
          {classesQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`max-w-[180px] ${inputClass}`}
        />
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-md py-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {t.attendanceRegister.totalStudents}: {roster.length}
        </span>
        {canWrite && roster.length > 0 && (
          <button
            type="button"
            onClick={markAllPresent}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-md py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t.attendanceRegister.markAllPresent}
          </button>
        )}
      </div>

      {!activeClassId ? (
        <p className="text-sm text-muted-foreground">{t.attendanceRegister.selectClassPrompt}</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.attendanceRegister.noStudentsInClass}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.studentName}</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.referenceNumber}</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.status}</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.arrivalTime}</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.notes}</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const label = student.user.email ?? student.user.civilId ?? student.admissionNumber;
                const row = rows[student.id] ?? { status: 'PRESENT' as AttendanceStatusValue, arrivalTime: '', note: '' };
                return (
                  <tr key={student.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-md py-sm">
                      <div className="flex items-center gap-sm">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(label)}
                        </span>
                        <span className="font-medium text-foreground">{label}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-md py-sm text-muted-foreground">{student.admissionNumber}</td>
                    <td className="px-md py-sm">
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={!canWrite}
                            onClick={() => setRow(student.id, { status })}
                            className={`cursor-pointer rounded-full border px-sm py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                              row.status === status ? STATUS_STYLES[status] : 'border-border text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {t.attendanceStatus[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-md py-sm">
                      <input
                        type="time"
                        disabled={!canWrite}
                        value={row.arrivalTime}
                        onChange={(e) => setRow(student.id, { arrivalTime: e.target.value })}
                        className={`w-32 ${inputClass}`}
                        dir="ltr"
                      />
                    </td>
                    <td className="px-md py-sm">
                      <input
                        type="text"
                        disabled={!canWrite}
                        value={row.note}
                        onChange={(e) => setRow(student.id, { note: e.target.value })}
                        placeholder={t.attendanceRegister.notePlaceholder}
                        className={`min-w-[160px] ${inputClass}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && activeClassId && roster.length > 0 && (
        <div className="flex items-center gap-md">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="cursor-pointer rounded-md bg-primary px-lg py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {saveMutation.isPending ? t.attendanceRegister.saving : t.attendanceRegister.save}
          </button>
          {saveMutation.isError && (
            <span className="text-sm text-destructive">
              {saveMutation.error instanceof ApiError ? saveMutation.error.message : 'Something went wrong'}
            </span>
          )}
          {saveMutation.isSuccess && lastSavedAt && (
            <span className="text-sm text-success">
              {t.attendanceRegister.saved} — {interpolate(t.attendanceRegister.lastUpdated, { time: lastSavedAt })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
