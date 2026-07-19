'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, Sparkles, Trash2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type ExamStatus = 'SCHEDULED' | 'UPCOMING' | 'COMPLETED';

interface Subject {
  id: string;
  name: string;
}
interface Question {
  id: string;
  subjectId: string;
  body: string;
  difficulty: Difficulty;
  points: number;
}
interface ExamQuestion {
  id: string;
  order: number;
  question: Question;
}
interface Exam {
  id: string;
  name: string;
  examType: string;
  examDate: string;
  subject: Subject;
  examQuestions: ExamQuestion[];
}

const EXAM_TYPES = ['Quiz', 'Midterm', 'Final'] as const;

const questionSchema = z.object({
  subjectId: z.string().uuid('Select a subject'),
  body: z.string().min(1, 'Required'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});
type QuestionInput = z.infer<typeof questionSchema>;

const generateSchema = z.object({
  subjectId: z.string().uuid('Select a subject'),
  name: z.string().min(1, 'Required'),
  examType: z.string().min(1, 'Required'),
  examDate: z.string().min(1, 'Required'),
  questionCount: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),
});
type GenerateInput = z.infer<typeof generateSchema>;

function deriveExamStatus(examDate: string): ExamStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(examDate);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'COMPLETED';
  if (diffDays <= 3) return 'UPCOMING';
  return 'SCHEDULED';
}

export default function ExamsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('exams:write');

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [viewExam, setViewExam] = useState<Exam | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: () => apiClient.get<Subject[]>('/subjects') });
  const questionsQuery = useQuery({ queryKey: ['questions'], queryFn: () => apiClient.get<Question[]>('/questions') });
  const examsQuery = useQuery({ queryKey: ['exams'], queryFn: () => apiClient.get<Exam[]>('/exams') });

  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const totalQuestions = questions.length;
  const difficultyPct = (d: Difficulty) =>
    totalQuestions > 0 ? Math.round((questions.filter((q) => q.difficulty === d).length / totalQuestions) * 100) : 0;

  const countsBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) map.set(q.subjectId, (map.get(q.subjectId) ?? 0) + 1);
    return map;
  }, [questions]);

  const {
    register: registerQ,
    handleSubmit: handleSubmitQ,
    reset: resetQ,
    formState: { errors: qErrors, isSubmitting: qSubmitting },
  } = useForm<QuestionInput>({ resolver: zodResolver(questionSchema) });

  const createQuestion = useMutation({
    mutationFn: (data: QuestionInput) => apiClient.post('/questions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setQuestionDialogOpen(false);
      resetQ();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const {
    register: registerGen,
    handleSubmit: handleSubmitGen,
    reset: resetGen,
    formState: { errors: genErrors, isSubmitting: genSubmitting },
  } = useForm<GenerateInput>({ resolver: zodResolver(generateSchema), defaultValues: { questionCount: 10 } });

  const generateExam = useMutation({
    mutationFn: (data: GenerateInput) => apiClient.post('/exams/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      resetGen({ questionCount: 10 });
      setGenError(null);
    },
    onError: (err) => setGenError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const deleteExam = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/exams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exams'] }),
  });

  const STATUS_STYLES: Record<ExamStatus, string> = {
    SCHEDULED: 'bg-muted text-muted-foreground',
    UPCOMING: 'bg-primary/10 text-primary',
    COMPLETED: 'bg-success/10 text-success',
  };
  const STATUS_LABELS: Record<ExamStatus, string> = {
    SCHEDULED: t.exams.statusScheduled,
    UPCOMING: t.exams.statusUpcoming,
    COMPLETED: t.exams.statusCompleted,
  };

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.exams.title}</h1>
          <p className="text-sm text-muted-foreground">{t.exams.subtitle}</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setServerError(null);
              setQuestionDialogOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.exams.newQuestion}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-sm font-semibold text-foreground">{t.exams.difficultyDistribution}</h2>
          <div className="space-y-sm text-sm">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
              <div key={d} className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {d === 'EASY' ? t.exams.easy : d === 'MEDIUM' ? t.exams.medium : t.exams.hard}
                </span>
                <span className="font-medium text-foreground">{difficultyPct(d)}%</span>
              </div>
            ))}
          </div>
        </div>

        {(subjectsQuery.data ?? []).slice(0, 3).map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-lg shadow-ambient">
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-sm py-0.5 text-xs font-medium text-primary">
              {interpolate(t.exams.questionsCount, { count: countsBySubject.get(s.id) ?? 0 })}
            </span>
            <h3 className="font-semibold text-foreground">{s.name}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient lg:col-span-1">
          <h2 className="mb-md text-lg font-bold text-foreground">{t.exams.examList}</h2>
          {examsQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}
          {!examsQuery.isLoading && (examsQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t.exams.noExamsYet}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.exams.examName}</th>
                  <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.exams.subjectCol}</th>
                  <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.exams.dateCol}</th>
                  <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.exams.statusCol}</th>
                  <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {(examsQuery.data ?? []).map((exam) => {
                  const status = deriveExamStatus(exam.examDate);
                  return (
                    <tr key={exam.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-md py-sm font-medium text-foreground">{exam.name}</td>
                      <td className="whitespace-nowrap px-md py-sm text-muted-foreground">{exam.subject.name}</td>
                      <td className="whitespace-nowrap px-md py-sm text-foreground">
                        {new Date(exam.examDate).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-md py-sm">
                        <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-md py-sm">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setViewExam(exam)}
                            className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
                            aria-label={t.exams.viewExam}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => confirm(`${t.common.delete} "${exam.name}"?`) && deleteExam.mutate(exam.id)}
                              className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Delete ${exam.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {canWrite && (
          <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
            <h2 className="mb-1 text-lg font-bold text-foreground">{t.exams.examCreator}</h2>
            <p className="mb-md text-sm text-muted-foreground">{t.exams.examCreatorDesc}</p>
            <form
              onSubmit={handleSubmitGen((data) => {
                setGenError(null);
                generateExam.mutate(data);
              })}
            >
              <FormField label={t.exams.selectSubject} htmlFor="genSubjectId" error={genErrors.subjectId?.message}>
                <select id="genSubjectId" className={inputClass} {...registerGen('subjectId')}>
                  <option value="">…</option>
                  {subjectsQuery.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={t.assignments.titleLabel} htmlFor="genName" error={genErrors.name?.message}>
                <input id="genName" className={inputClass} {...registerGen('name')} />
              </FormField>

              <FormField label={t.exams.examType} htmlFor="genType" error={genErrors.examType?.message}>
                <select id="genType" className={inputClass} {...registerGen('examType')}>
                  {EXAM_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={t.exams.examDate} htmlFor="genDate" error={genErrors.examDate?.message}>
                <input id="genDate" type="date" className={inputClass} {...registerGen('examDate')} />
              </FormField>

              <FormField label={t.exams.questionCount} htmlFor="genCount" error={genErrors.questionCount?.message}>
                <input id="genCount" type="number" min={1} className={inputClass} {...registerGen('questionCount')} />
              </FormField>

              {genError && <p className="mb-md text-sm text-destructive">{genError}</p>}

              <button
                type="submit"
                disabled={genSubmitting}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {genSubmitting ? t.common.creating : t.exams.generateNow}
              </button>
            </form>
          </div>
        )}
      </div>

      <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)} title={t.exams.newQuestion}>
        <form
          onSubmit={handleSubmitQ((data) => {
            setServerError(null);
            createQuestion.mutate(data);
          })}
        >
          <FormField label={t.exams.selectSubject} htmlFor="qSubjectId" error={qErrors.subjectId?.message}>
            <select id="qSubjectId" className={inputClass} {...registerQ('subjectId')}>
              <option value="">…</option>
              {subjectsQuery.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.exams.questionBody} htmlFor="qBody" error={qErrors.body?.message}>
            <input id="qBody" className={inputClass} {...registerQ('body')} />
          </FormField>

          <FormField label={t.exams.difficulty} htmlFor="qDifficulty">
            <select id="qDifficulty" className={inputClass} {...registerQ('difficulty')}>
              <option value="EASY">{t.exams.easy}</option>
              <option value="MEDIUM">{t.exams.medium}</option>
              <option value="HARD">{t.exams.hard}</option>
            </select>
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={qSubmitting}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {qSubmitting ? t.common.creating : t.common.create}
          </button>
        </form>
      </Dialog>

      {viewExam && (
        <Dialog open onClose={() => setViewExam(null)} title={viewExam.name}>
          {viewExam.examQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.exams.noQuestionsYet}</p>
          ) : (
            <div className="max-h-[60vh] space-y-sm overflow-y-auto">
              <h3 className="text-sm font-semibold text-foreground">{t.exams.examQuestionsTitle}</h3>
              {[...viewExam.examQuestions]
                .sort((a, b) => a.order - b.order)
                .map((eq, i) => (
                  <div key={eq.id} className="rounded-md border border-border p-sm text-sm">
                    <div className="flex items-start justify-between gap-sm">
                      <span className="text-foreground">
                        {i + 1}. {eq.question.body}
                      </span>
                      <span className="whitespace-nowrap rounded-full bg-muted px-sm py-0.5 text-xs text-muted-foreground">
                        {eq.question.difficulty === 'EASY' ? t.exams.easy : eq.question.difficulty === 'MEDIUM' ? t.exams.medium : t.exams.hard}
                        {' · '}
                        {eq.question.points} {t.exams.pointsLabel}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
