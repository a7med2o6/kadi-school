'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, MoreVertical, Plus, School, Search, Trash2, Users } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}
interface GradeLevel {
  id: string;
  name: string;
}
interface Teacher {
  id: string;
  user: { email: string | null };
}
interface SchoolClass {
  id: string;
  name: string;
  capacity: number | null;
  gradeLevel: GradeLevel;
  academicYear: AcademicYear;
  homeroomTeacher: Teacher | null;
  _count: { students: number };
}

const classSchema = z.object({
  name: z.string().min(1, 'Required'),
  gradeLevelId: z.string().uuid('Select a grade level'),
  academicYearId: z.string().uuid('Select an academic year'),
  homeroomTeacherId: z.string().optional(),
  // An empty <input type="number"> submits "" — coerce that to undefined
  // before the number check runs, or z.coerce.number()("") becomes 0 and
  // fails .positive(), silently blocking submission whenever left blank.
  capacity: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
});
type ClassInput = z.infer<typeof classSchema>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const canWrite = hasPermission('classes:write');
  const t = useTranslations();

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => apiClient.get<SchoolClass[]>('/classes') });
  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => apiClient.get<AcademicYear[]>('/academic-years'),
  });
  const gradesQuery = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => apiClient.get<GradeLevel[]>('/grade-levels'),
  });
  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => apiClient.get<Teacher[]>('/teachers') });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassInput>({ resolver: zodResolver(classSchema) });

  const createClass = useMutation({
    mutationFn: (data: ClassInput) =>
      apiClient.post('/classes', { ...data, homeroomTeacherId: data.homeroomTeacherId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/classes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });

  const filtered = useMemo(() => {
    const rows = classesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.name} ${r.gradeLevel.name} ${r.academicYear.name}`.toLowerCase().includes(q)) return false;
      if (gradeFilter && r.gradeLevel.id !== gradeFilter) return false;
      if (yearFilter && r.academicYear.id !== yearFilter) return false;
      return true;
    });
  }, [classesQuery.data, search, gradeFilter, yearFilter]);

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.classes.title}</h1>
          <p className="text-sm text-muted-foreground">{t.classes.subtitle}</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setServerError(null);
              setDialogOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.classes.newClass}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.common.search}
            className="w-full rounded-md border border-input bg-background py-sm ps-9 pe-md text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="">{t.classes.gradeLevel}</option>
          {gradesQuery.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="">{t.classes.academicYear}</option>
          {yearsQuery.data?.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>

      {classesQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}
      {classesQuery.error && (
        <p className="text-sm text-destructive">{(classesQuery.error as Error).message}</p>
      )}

      {!classesQuery.isLoading && !classesQuery.error && (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="relative flex flex-col rounded-lg border border-border bg-card p-lg shadow-ambient"
            >
              <div className="mb-md flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <School className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-sm py-0.5 text-xs font-medium ${
                      c.academicYear.isCurrent
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.academicYear.isCurrent ? t.common.active : t.common.inactive}
                  </span>
                  {canWrite && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((id) => (id === c.id ? null : c.id))}
                        onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                        aria-label={t.common.actions}
                        className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === c.id && (
                        <div className="absolute end-0 top-full z-20 mt-1 w-40 rounded border border-border bg-popover py-1 shadow-ambient">
                          <button
                            type="button"
                            onClick={() => confirm(`${t.common.delete} "${c.name}"?`) && deleteClass.mutate(c.id)}
                            className="flex w-full cursor-pointer items-center gap-2 px-md py-sm text-start text-sm text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t.common.delete}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-foreground">{c.name}</h3>
              <p className="mb-md text-sm text-muted-foreground">
                {c.gradeLevel.name} · {c.academicYear.name}
              </p>

              <div className="mb-md flex items-center gap-2 rounded-md bg-accent/40 px-md py-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {c.homeroomTeacher ? initials(c.homeroomTeacher.user.email ?? '') || 'T' : '—'}
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{t.classes.classLead}</div>
                  <div className="truncate text-sm text-foreground">
                    {c.homeroomTeacher?.user.email ?? t.classes.noHomeroomTeacher}
                  </div>
                </div>
              </div>

              <div className="mb-lg flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t.classes.unassignedRoom}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {c._count.students}
                  {c.capacity ? ` / ${c.capacity}` : ''} {t.classes.students}
                </span>
              </div>

              <button
                type="button"
                disabled
                title={t.common.comingSoon}
                className="mt-auto w-full cursor-not-allowed rounded-md border border-border py-sm text-sm font-medium text-muted-foreground"
              >
                {t.classes.details}
              </button>
            </div>
          ))}

          {canWrite && (
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setDialogOpen(true);
              }}
              className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-lg text-center text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                <Plus className="h-5 w-5" />
              </span>
              <span className="font-medium">{t.classes.addNewClass}</span>
              <span className="max-w-[220px] text-xs">{t.classes.addNewClassDesc}</span>
            </button>
          )}

          {!canWrite && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.common.noRecords}</p>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t.classes.addNewClass}>
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createClass.mutate(data);
          })}
        >
          <FormField label={t.classes.name} htmlFor="name" error={errors.name?.message}>
            <input id="name" className={inputClass} placeholder="5A" {...register('name')} />
          </FormField>

          <FormField label={t.classes.gradeLevel} htmlFor="gradeLevelId" error={errors.gradeLevelId?.message}>
            <select id="gradeLevelId" className={inputClass} {...register('gradeLevelId')}>
              <option value="">…</option>
              {gradesQuery.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.classes.academicYear} htmlFor="academicYearId" error={errors.academicYearId?.message}>
            <select id="academicYearId" className={inputClass} {...register('academicYearId')}>
              <option value="">…</option>
              {yearsQuery.data?.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.classes.homeroomTeacher} htmlFor="homeroomTeacherId">
            <select id="homeroomTeacherId" className={inputClass} {...register('homeroomTeacherId')}>
              <option value="">{t.classes.noHomeroomTeacher}</option>
              {teachersQuery.data?.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.user.email}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={`${t.classes.capacity} (${t.common.optional})`} htmlFor="capacity" error={errors.capacity?.message}>
            <input id="capacity" type="number" className={inputClass} {...register('capacity')} />
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
    </div>
  );
}
