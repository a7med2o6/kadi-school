'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';

type Component = 'QUIZZES' | 'MIDTERM' | 'FINAL' | 'PARTICIPATION';
const COMPONENTS: Component[] = ['QUIZZES', 'MIDTERM', 'FINAL', 'PARTICIPATION'];
const MAX_SCORES: Record<Component, number> = { QUIZZES: 20, MIDTERM: 20, FINAL: 40, PARTICIPATION: 20 };
const MAX_TOTAL = 100;

interface ClassSubjectOption {
  id: string;
  classId: string;
  class: { name: string };
  subject: { name: string };
}
interface Student {
  id: string;
  admissionNumber: string;
  class: { id: string } | null;
  user: { email: string | null; civilId: string | null };
}
interface GradeRow {
  studentId: string;
  component: Component;
  score: number;
}

type RowState = Record<Component, number | ''>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function statusFor(total: number, t: ReturnType<typeof useTranslations>) {
  if (total >= 90) return { label: t.grades.statusExcellent, className: 'bg-success/10 text-success' };
  if (total >= 80) return { label: t.grades.statusVeryGood, className: 'bg-primary/10 text-primary' };
  if (total >= 60) return { label: t.grades.statusGood, className: 'bg-tertiary/10 text-tertiary' };
  return { label: t.grades.statusNeedsImprovement, className: 'bg-destructive/10 text-destructive' };
}

export default function GradebookPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('grades:write');

  const [classSubjectId, setClassSubjectId] = useState('');
  const [term, setTerm] = useState('1');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const classSubjectsQuery = useQuery({
    queryKey: ['class-subjects'],
    queryFn: () => apiClient.get<ClassSubjectOption[]>('/class-subjects'),
  });
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });

  const activeClassSubjectId = classSubjectId || classSubjectsQuery.data?.[0]?.id || '';
  const activeClassSubject = classSubjectsQuery.data?.find((cs) => cs.id === activeClassSubjectId);
  const roster = useMemo(
    () => (studentsQuery.data ?? []).filter((s) => s.class?.id === activeClassSubject?.classId),
    [studentsQuery.data, activeClassSubject],
  );

  const gradesQuery = useQuery({
    queryKey: ['grades', activeClassSubjectId, term],
    queryFn: () => apiClient.get<GradeRow[]>(`/grades?classSubjectId=${activeClassSubjectId}&term=${term}`),
    enabled: !!activeClassSubjectId,
  });

  useEffect(() => {
    if (!gradesQuery.data) return;
    const byStudent = new Map<string, GradeRow[]>();
    for (const g of gradesQuery.data) {
      byStudent.set(g.studentId, [...(byStudent.get(g.studentId) ?? []), g]);
    }
    const next: Record<string, RowState> = {};
    for (const student of roster) {
      const existing = byStudent.get(student.id) ?? [];
      const row = {} as RowState;
      for (const c of COMPONENTS) {
        row[c] = existing.find((g) => g.component === c)?.score ?? '';
      }
      next[student.id] = row;
    }
    setRows(next);
  }, [gradesQuery.data, roster]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/grades/bulk', {
        classSubjectId: activeClassSubjectId,
        term,
        records: roster.flatMap((s) =>
          COMPONENTS.filter((c) => rows[s.id]?.[c] !== '' && rows[s.id]?.[c] !== undefined).map((c) => ({
            studentId: s.id,
            component: c,
            score: Number(rows[s.id][c]),
          })),
        ),
      }),
    onSuccess: () => {
      setLastSaved(new Date().toLocaleTimeString());
      queryClient.invalidateQueries({ queryKey: ['grades', activeClassSubjectId, term] });
    },
  });

  function setScore(studentId: string, component: Component, value: string) {
    const num = value === '' ? '' : Math.max(0, Math.min(MAX_SCORES[component], Number(value)));
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [component]: num } }));
  }

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const student of roster) {
      const row = rows[student.id];
      out[student.id] = row ? COMPONENTS.reduce((sum, c) => sum + (Number(row[c]) || 0), 0) : 0;
    }
    return out;
  }, [rows, roster]);

  const enteredTotals = roster
    .map((s) => totals[s.id])
    .filter((_, i) => COMPONENTS.some((c) => rows[roster[i]?.id]?.[c] !== '' && rows[roster[i]?.id]?.[c] !== undefined));
  const lowestScore = enteredTotals.length > 0 ? Math.min(...enteredTotals) : null;
  const highestScore = enteredTotals.length > 0 ? Math.max(...enteredTotals) : null;
  const passCount = enteredTotals.filter((v) => v >= 60).length;
  const passRate = enteredTotals.length > 0 ? Math.round((passCount / enteredTotals.length) * 100) : null;
  const classAverage =
    enteredTotals.length > 0 ? Math.round(enteredTotals.reduce((a, b) => a + b, 0) / enteredTotals.length) : null;

  const needingAttention = roster.filter((s) => {
    const row = rows[s.id];
    const hasAnyEntry = row && COMPONENTS.some((c) => row[c] !== '' && row[c] !== undefined);
    return hasAnyEntry && totals[s.id] < 60;
  });

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.grades.title}</h1>
        <p className="text-sm text-muted-foreground">{t.grades.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="text-2xl font-bold text-foreground">{lowestScore ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{t.grades.lowestScore}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-foreground">{highestScore ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{t.grades.highestScore}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-foreground">{passRate !== null ? `${passRate}%` : '—'}</div>
          <div className="text-xs text-muted-foreground">{t.grades.passRate}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-foreground">{classAverage ?? '—'}%</div>
          <div className="text-xs text-muted-foreground">{t.grades.classAverage}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-sm rounded-lg border border-border bg-card p-lg shadow-ambient">
        <select
          value={activeClassSubjectId}
          onChange={(e) => setClassSubjectId(e.target.value)}
          className={`max-w-xs ${inputClass}`}
        >
          {classSubjectsQuery.data?.map((cs) => (
            <option key={cs.id} value={cs.id}>
              {cs.class.name} · {cs.subject.name}
            </option>
          ))}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={`max-w-xs ${inputClass}`}>
          <option value="1">{t.grades.term1}</option>
          <option value="2">{t.grades.term2}</option>
        </select>

        <div className="ms-auto flex flex-wrap gap-sm">
          {canWrite && (
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || roster.length === 0}
              className="cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {saveMutation.isPending ? t.grades.saving : t.grades.save}
            </button>
          )}
          <button
            type="button"
            disabled
            title={t.common.comingSoon}
            className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
          >
            <Upload className="h-4 w-4" />
            {t.grades.importBulk}
          </button>
          <button
            type="button"
            disabled
            title={t.common.comingSoon}
            className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
          >
            <Download className="h-4 w-4" />
            {t.grades.exportPdf}
          </button>
        </div>
      </div>

      {saveMutation.isError && (
        <p className="text-sm text-destructive">
          {saveMutation.error instanceof ApiError ? saveMutation.error.message : 'Something went wrong'}
        </p>
      )}
      {saveMutation.isSuccess && lastSaved && <p className="text-sm text-success">{t.grades.saved} — {lastSaved}</p>}

      {!activeClassSubjectId ? (
        <p className="text-sm text-muted-foreground">{t.grades.selectClassPrompt}</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.grades.noStudentsInClass}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.studentName}</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.quizzes} ({MAX_SCORES.QUIZZES})</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.midterm} ({MAX_SCORES.MIDTERM})</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.final} ({MAX_SCORES.FINAL})</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.participation} ({MAX_SCORES.PARTICIPATION})</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.total} ({MAX_TOTAL})</th>
                <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.statusLabel}</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const label = student.user.email ?? student.user.civilId ?? student.admissionNumber;
                const row = rows[student.id];
                const total = totals[student.id] ?? 0;
                const hasAnyEntry = row && COMPONENTS.some((c) => row[c] !== '' && row[c] !== undefined);
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
                    {COMPONENTS.map((c) => (
                      <td key={c} className="px-md py-sm">
                        <input
                          type="number"
                          min={0}
                          max={MAX_SCORES[c]}
                          disabled={!canWrite}
                          value={row?.[c] ?? ''}
                          onChange={(e) => setScore(student.id, c, e.target.value)}
                          className={`w-20 ${inputClass}`}
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-md py-sm font-semibold text-foreground">{hasAnyEntry ? total : '—'}</td>
                    <td className="whitespace-nowrap px-md py-sm">
                      {hasAnyEntry && (
                        <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${statusFor(total, t).className}`}>
                          {statusFor(total, t).label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeClassSubjectId && roster.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="mb-md flex items-center gap-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-foreground">{t.grades.needsAttention}</h2>
          </div>
          <p className="mb-md text-sm text-muted-foreground">{t.grades.needsAttentionDesc}</p>
          {needingAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.grades.noOneNeedsAttention}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {needingAttention.map((s) => (
                <li key={s.id} className="text-foreground">
                  {s.user.email ?? s.user.civilId ?? s.admissionNumber} — {totals[s.id]}/{MAX_TOTAL}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
