'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';

type DerivedStatus = 'IN_PROGRESS' | 'AWAITING_GRADING' | 'COMPLETED';

interface ClassSubjectOption {
  id: string;
  classId: string;
  class: { name: string };
  subject: { name: string };
}
interface Submission {
  id: string;
  studentId: string;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
}
interface Assignment {
  id: string;
  classSubjectId: string;
  title: string;
  description: string | null;
  dueAt: string;
  maxScore: number;
  classSubject: { class: { name: string }; subject: { name: string } };
  submissions: Submission[];
}
interface Student {
  id: string;
  admissionNumber: string;
  class: { id: string } | null;
  user: { email: string | null; civilId: string | null };
}

const assignmentSchema = z.object({
  classSubjectId: z.string().uuid('Select a class/subject'),
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  dueAt: z.string().min(1, 'Required'),
  maxScore: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().positive().optional()),
});
type AssignmentInput = z.infer<typeof assignmentSchema>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function deriveStatus(assignment: Assignment, rosterSize: number): DerivedStatus {
  if (new Date(assignment.dueAt).getTime() > Date.now()) return 'IN_PROGRESS';
  const gradedCount = assignment.submissions.filter((s) => s.score !== null).length;
  return gradedCount >= rosterSize && rosterSize > 0 ? 'COMPLETED' : 'AWAITING_GRADING';
}

export default function AssignmentsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('homework:write');

  const [createOpen, setCreateOpen] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const classSubjectsQuery = useQuery({
    queryKey: ['class-subjects'],
    queryFn: () => apiClient.get<ClassSubjectOption[]>('/class-subjects'),
  });
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });
  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: () => apiClient.get<Assignment[]>('/assignments'),
  });

  const rosterSizeByClassSubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const cs of classSubjectsQuery.data ?? []) {
      map.set(cs.id, (studentsQuery.data ?? []).filter((s) => s.class?.id === cs.classId).length);
    }
    return map;
  }, [classSubjectsQuery.data, studentsQuery.data]);

  const enriched = useMemo(
    () =>
      (assignmentsQuery.data ?? []).map((a) => ({
        assignment: a,
        rosterSize: rosterSizeByClassSubject.get(a.classSubjectId) ?? 0,
        status: deriveStatus(a, rosterSizeByClassSubject.get(a.classSubjectId) ?? 0),
      })),
    [assignmentsQuery.data, rosterSizeByClassSubject],
  );

  const filtered = enriched
    .filter((e) => !statusFilter || e.status === statusFilter)
    .filter((e) => !subjectFilter || e.assignment.classSubjectId === subjectFilter)
    .sort((a, b) => new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime());

  const today = new Date().toDateString();
  const dueTodayCount = enriched.filter(
    (e) => e.status === 'IN_PROGRESS' && new Date(e.assignment.dueAt).toDateString() === today,
  ).length;
  const awaitingGradingCount = enriched.filter((e) => e.status === 'AWAITING_GRADING').length;
  const totalActive = enriched.filter((e) => e.status !== 'COMPLETED').length;
  const totalSubmitted = enriched.reduce((sum, e) => sum + e.assignment.submissions.filter((s) => s.submittedAt).length, 0);
  const totalSlots = enriched.reduce((sum, e) => sum + e.rosterSize, 0);
  const submissionRate = totalSlots > 0 ? Math.round((totalSubmitted / totalSlots) * 100) : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentInput>({ resolver: zodResolver(assignmentSchema) });

  const createMutation = useMutation({
    mutationFn: (data: AssignmentInput) => apiClient.post('/assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setCreateOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const STATUS_STYLES: Record<DerivedStatus, string> = {
    IN_PROGRESS: 'bg-primary/10 text-primary',
    AWAITING_GRADING: 'bg-tertiary/10 text-tertiary',
    COMPLETED: 'bg-success/10 text-success',
  };
  const STATUS_LABELS: Record<DerivedStatus, string> = {
    IN_PROGRESS: t.assignments.statusInProgress,
    AWAITING_GRADING: t.assignments.statusAwaitingGrading,
    COMPLETED: t.assignments.statusCompleted,
  };

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.assignments.title}</h1>
          <p className="text-sm text-muted-foreground">{t.assignments.subtitle}</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setServerError(null);
              setCreateOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.assignments.newAssignment}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-destructive">{dueTodayCount}</div>
          <div className="text-xs text-muted-foreground">{t.assignments.dueToday}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-tertiary">{awaitingGradingCount}</div>
          <div className="text-xs text-muted-foreground">{t.assignments.awaitingGrading}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-primary">{submissionRate !== null ? `${submissionRate}%` : '—'}</div>
          <div className="text-xs text-muted-foreground">{t.assignments.submissionRate}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <div className="text-2xl font-bold text-foreground">{totalActive}</div>
          <div className="text-xs text-muted-foreground">{t.assignments.totalActive}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-sm rounded-lg border border-border bg-card p-lg shadow-ambient">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`max-w-xs ${inputClass}`}>
          <option value="">{t.assignments.allStatuses}</option>
          <option value="IN_PROGRESS">{t.assignments.statusInProgress}</option>
          <option value="AWAITING_GRADING">{t.assignments.statusAwaitingGrading}</option>
          <option value="COMPLETED">{t.assignments.statusCompleted}</option>
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={`max-w-xs ${inputClass}`}>
          <option value="">{t.assignments.allSubjects}</option>
          {classSubjectsQuery.data?.map((cs) => (
            <option key={cs.id} value={cs.id}>
              {cs.class.name} · {cs.subject.name}
            </option>
          ))}
        </select>
      </div>

      {assignmentsQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}
      {!assignmentsQuery.isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.assignments.noAssignmentsYet}</p>
      )}

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(({ assignment, status, rosterSize }) => {
          const submittedCount = assignment.submissions.filter((s) => s.submittedAt).length;
          const pct = rosterSize > 0 ? Math.round((submittedCount / rosterSize) * 100) : 0;
          return (
            <div key={assignment.id} className="flex flex-col rounded-lg border border-border bg-card p-lg shadow-ambient">
              <div className="mb-sm flex items-center justify-between">
                <span className="rounded-full bg-muted px-sm py-0.5 text-xs font-medium text-muted-foreground">
                  {assignment.classSubject.subject.name}
                </span>
                <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{assignment.title}</h3>
              {assignment.description && (
                <p className="mb-sm line-clamp-2 text-sm text-muted-foreground">{assignment.description}</p>
              )}
              <p className="mb-md text-xs text-muted-foreground">
                {t.assignments.due}: {new Date(assignment.dueAt).toLocaleDateString()} · {assignment.classSubject.class.name}
              </p>

              <div className="mt-auto space-y-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {submittedCount}/{rosterSize} {t.assignments.submitted}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setGradingAssignment(assignment)}
                    className="w-full cursor-pointer rounded-md border border-border py-sm text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {t.assignments.gradeSubmissions}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setServerError(null);
              setCreateOpen(true);
            }}
            className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-lg text-center text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
              <Plus className="h-5 w-5" />
            </span>
            <span className="font-medium">{t.assignments.addNew}</span>
            <span className="max-w-[220px] text-xs">{t.assignments.addNewDesc}</span>
          </button>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t.assignments.addNew}>
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createMutation.mutate(data);
          })}
        >
          <FormField label={t.assignments.classSubjectLabel} htmlFor="classSubjectId" error={errors.classSubjectId?.message}>
            <select id="classSubjectId" className={inputClass} {...register('classSubjectId')}>
              <option value="">…</option>
              {classSubjectsQuery.data?.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.class.name} · {cs.subject.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.assignments.titleLabel} htmlFor="title" error={errors.title?.message}>
            <input id="title" className={inputClass} {...register('title')} />
          </FormField>

          <FormField label={`${t.assignments.descriptionLabel} (${t.common.optional})`} htmlFor="description">
            <input id="description" className={inputClass} {...register('description')} />
          </FormField>

          <FormField label={t.assignments.dueAtLabel} htmlFor="dueAt" error={errors.dueAt?.message}>
            <input id="dueAt" type="datetime-local" className={inputClass} {...register('dueAt')} />
          </FormField>

          <FormField label={`${t.assignments.maxScoreLabel} (${t.common.optional})`} htmlFor="maxScore" error={errors.maxScore?.message}>
            <input id="maxScore" type="number" placeholder="20" className={inputClass} {...register('maxScore')} />
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t.common.creating : t.common.create}
          </button>
        </form>
      </Dialog>

      {gradingAssignment && <GradingDialog assignment={gradingAssignment} onClose={() => setGradingAssignment(null)} />}
    </div>
  );
}

interface GradingDialogProps {
  assignment: Assignment;
  onClose: () => void;
}

function GradingDialog({ assignment, onClose }: GradingDialogProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });
  const classSubjectsQuery = useQuery({
    queryKey: ['class-subjects'],
    queryFn: () => apiClient.get<ClassSubjectOption[]>('/class-subjects'),
  });
  const classSubject = classSubjectsQuery.data?.find((cs) => cs.id === assignment.classSubjectId);
  const roster = (studentsQuery.data ?? []).filter((s) => s.class?.id === classSubject?.classId);

  const [rows, setRows] = useState<Record<string, { submitted: boolean; score: string; feedback: string }>>(() => {
    const initial: Record<string, { submitted: boolean; score: string; feedback: string }> = {};
    for (const sub of assignment.submissions) {
      initial[sub.studentId] = {
        submitted: !!sub.submittedAt,
        score: sub.score !== null ? String(sub.score) : '',
        feedback: sub.feedback ?? '',
      };
    }
    return initial;
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/assignments/${assignment.id}/submissions/bulk`, {
        records: roster.map((s) => {
          const row = rows[s.id] ?? { submitted: false, score: '', feedback: '' };
          return {
            studentId: s.id,
            submitted: row.submitted,
            score: row.score === '' ? undefined : Number(row.score),
            feedback: row.feedback || undefined,
          };
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      onClose();
    },
  });

  function setRow(studentId: string, patch: Partial<{ submitted: boolean; score: string; feedback: string }>) {
    setRows((prev) => {
      const current = prev[studentId] ?? { submitted: false, score: '', feedback: '' };
      return { ...prev, [studentId]: { ...current, ...patch } };
    });
  }

  return (
    <Dialog open onClose={onClose} title={assignment.title}>
      <div className="max-h-[60vh] space-y-sm overflow-y-auto">
        {roster.map((student) => {
          const label = student.user.email ?? student.user.civilId ?? student.admissionNumber;
          const row = rows[student.id] ?? { submitted: false, score: '', feedback: '' };
          return (
            <div key={student.id} className="grid grid-cols-[1fr_auto_80px_1fr] items-center gap-sm rounded-md border border-border p-sm">
              <span className="flex min-w-0 items-center gap-sm truncate text-sm font-medium text-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials(label)}
                </span>
                <span className="truncate">{label}</span>
              </span>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={row.submitted}
                  onChange={(e) => setRow(student.id, { submitted: e.target.checked })}
                />
                {t.assignments.submittedCol}
              </label>
              <input
                type="number"
                min={0}
                max={assignment.maxScore}
                value={row.score}
                onChange={(e) => setRow(student.id, { score: e.target.value })}
                className={inputClass}
              />
              <input
                type="text"
                placeholder={t.assignments.feedbackCol}
                value={row.feedback}
                onChange={(e) => setRow(student.id, { feedback: e.target.value })}
                className={inputClass}
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="mt-md w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {saveMutation.isPending ? t.common.creating : t.assignments.saveGrades}
      </button>
    </Dialog>
  );
}
