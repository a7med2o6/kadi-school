'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';

interface AcademicYear {
  id: string;
  name: string;
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

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const canWrite = hasPermission('classes:write');

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

  const columns: DataTableColumn<SchoolClass>[] = [
    { key: 'name', label: 'Class', render: (r) => r.name },
    { key: 'grade', label: 'Grade level', render: (r) => r.gradeLevel.name },
    { key: 'year', label: 'Academic year', render: (r) => r.academicYear.name },
    { key: 'homeroom', label: 'Homeroom teacher', render: (r) => r.homeroomTeacher?.user.email ?? '—' },
    { key: 'capacity', label: 'Capacity', render: (r) => r.capacity ?? '—' },
  ];

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Classes</h1>
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
            New Class
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={classesQuery.data ?? []}
        isLoading={classesQuery.isLoading}
        error={classesQuery.error ? (classesQuery.error as Error).message : null}
        getSearchText={(r) => `${r.name} ${r.gradeLevel.name} ${r.academicYear.name}`}
        searchPlaceholder="Search classes…"
        rowActions={
          canWrite
            ? (r) => (
                <button
                  type="button"
                  onClick={() => confirm(`Delete class "${r.name}"?`) && deleteClass.mutate(r.id)}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${r.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            : undefined
        }
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Class">
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createClass.mutate(data);
          })}
        >
          <FormField label="Name" htmlFor="name" error={errors.name?.message}>
            <input id="name" className={inputClass} placeholder="5A" {...register('name')} />
          </FormField>

          <FormField label="Grade level" htmlFor="gradeLevelId" error={errors.gradeLevelId?.message}>
            <select id="gradeLevelId" className={inputClass} {...register('gradeLevelId')}>
              <option value="">Select…</option>
              {gradesQuery.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Academic year" htmlFor="academicYearId" error={errors.academicYearId?.message}>
            <select id="academicYearId" className={inputClass} {...register('academicYearId')}>
              <option value="">Select…</option>
              {yearsQuery.data?.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Homeroom teacher (optional)" htmlFor="homeroomTeacherId">
            <select id="homeroomTeacherId" className={inputClass} {...register('homeroomTeacherId')}>
              <option value="">None</option>
              {teachersQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user.email}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Capacity (optional)" htmlFor="capacity" error={errors.capacity?.message}>
            <input id="capacity" type="number" className={inputClass} {...register('capacity')} />
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
