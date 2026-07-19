'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';

interface Teacher {
  id: string;
  employeeNumber: string;
  department: string | null;
  employmentType: string;
  user: { email: string | null; status: string };
}

const teacherSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  employeeNumber: z.string().min(1, 'Required'),
  hireDate: z.string().min(1, 'Required'),
  department: z.string().optional(),
});
type TeacherInput = z.infer<typeof teacherSchema>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const canWrite = hasPermission('teachers:write');
  const t = useTranslations();

  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => apiClient.get<Teacher[]>('/teachers') });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherInput>({ resolver: zodResolver(teacherSchema) });

  const createTeacher = useMutation({
    mutationFn: (data: TeacherInput) => apiClient.post('/teachers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const removeTeacher = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/teachers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const columns: DataTableColumn<Teacher>[] = [
    {
      key: 'name',
      label: t.teachers.name,
      render: (r) => (
        <Link href={`/teachers/${r.id}`} className="flex items-center gap-sm hover:opacity-80">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(r.user.email ?? '')}
          </span>
          <span>
            <span className="block font-medium text-foreground">{r.user.email ?? '—'}</span>
            <span className="block text-xs text-muted-foreground">{r.employeeNumber}</span>
          </span>
        </Link>
      ),
    },
    { key: 'employeeNumber', label: t.teachers.employeeId, render: (r) => r.employeeNumber },
    { key: 'department', label: t.teachers.department, render: (r) => r.department ?? '—' },
    {
      key: 'status',
      label: t.teachers.status,
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-sm py-0.5 text-xs font-medium ${
            r.user.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${r.user.status === 'ACTIVE' ? 'bg-success' : 'bg-destructive'}`} />
          {r.user.status === 'ACTIVE' ? t.common.active : t.common.inactive}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.teachers.title}</h1>
          <p className="text-sm text-muted-foreground">{t.teachers.subtitle}</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setServerError(null);
              setDialogOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.teachers.addTeacher}
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={teachersQuery.data ?? []}
        isLoading={teachersQuery.isLoading}
        error={teachersQuery.error ? (teachersQuery.error as Error).message : null}
        getSearchText={(r) => `${r.user.email ?? ''} ${r.employeeNumber} ${r.department ?? ''}`}
        searchPlaceholder={t.teachers.searchPlaceholder}
        rowActions={
          canWrite
            ? (r) => (
                <button
                  type="button"
                  onClick={() =>
                    confirm(interpolate(t.teachers.suspendConfirm, { email: r.user.email ?? '' })) &&
                    removeTeacher.mutate(r.id)
                  }
                  className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Suspend ${r.user.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            : undefined
        }
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t.teachers.newTeacher}>
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createTeacher.mutate(data);
          })}
        >
          <FormField label={t.teachers.email} htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register('email')} />
          </FormField>

          <FormField label={t.teachers.tempPassword} htmlFor="password" error={errors.password?.message}>
            <input id="password" type="text" className={inputClass} {...register('password')} />
          </FormField>

          <FormField label={t.teachers.employeeNumber} htmlFor="employeeNumber" error={errors.employeeNumber?.message}>
            <input id="employeeNumber" className={inputClass} {...register('employeeNumber')} />
          </FormField>

          <FormField label={t.teachers.hireDate} htmlFor="hireDate" error={errors.hireDate?.message}>
            <input id="hireDate" type="date" className={inputClass} {...register('hireDate')} />
          </FormField>

          <FormField label={t.teachers.departmentOptional} htmlFor="department">
            <input id="department" className={inputClass} {...register('department')} />
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t.common.creating : t.common.create}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
