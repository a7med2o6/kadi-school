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

interface Subject {
  id: string;
  name: string;
  code: string;
}

const subjectSchema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Required'),
});
type SubjectInput = z.infer<typeof subjectSchema>;

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const canWrite = hasPermission('subjects:write');

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: () => apiClient.get<Subject[]>('/subjects') });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectInput>({ resolver: zodResolver(subjectSchema) });

  const createSubject = useMutation({
    mutationFn: (data: SubjectInput) => apiClient.post('/subjects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const deleteSubject = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subjects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });

  const columns: DataTableColumn<Subject>[] = [
    { key: 'name', label: 'Name', render: (r) => r.name },
    { key: 'code', label: 'Code', render: (r) => r.code },
  ];

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Subjects</h1>
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
            New Subject
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={subjectsQuery.data ?? []}
        isLoading={subjectsQuery.isLoading}
        error={subjectsQuery.error ? (subjectsQuery.error as Error).message : null}
        getSearchText={(r) => `${r.name} ${r.code}`}
        searchPlaceholder="Search subjects…"
        rowActions={
          canWrite
            ? (r) => (
                <button
                  type="button"
                  onClick={() => confirm(`Delete subject "${r.name}"?`) && deleteSubject.mutate(r.id)}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${r.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            : undefined
        }
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Subject">
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createSubject.mutate(data);
          })}
        >
          <FormField label="Name" htmlFor="name" error={errors.name?.message}>
            <input id="name" className={inputClass} placeholder="Mathematics" {...register('name')} />
          </FormField>

          <FormField label="Code" htmlFor="code" error={errors.code?.message}>
            <input id="code" className={inputClass} placeholder="MATH5" {...register('code')} />
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
