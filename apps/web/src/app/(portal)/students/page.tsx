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

interface SchoolClass {
  id: string;
  name: string;
}
interface Guardian {
  relationship: string;
  parent: { user: { email: string | null; phone: string | null } };
}
interface Student {
  id: string;
  admissionNumber: string;
  status: string;
  class: SchoolClass | null;
  user: { email: string | null; civilId: string | null; phone: string | null };
  guardians: Guardian[];
}

const studentSchema = z.object({
  civilId: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(8, 'At least 8 characters'),
  admissionNumber: z.string().min(1, 'Required'),
  classId: z.string().optional(),
});
type StudentInput = z.infer<typeof studentSchema>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const canWrite = hasPermission('students:write');

  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiClient.get<SchoolClass[]>('/classes'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentInput>({ resolver: zodResolver(studentSchema) });

  const createStudent = useMutation({
    mutationFn: (data: StudentInput) =>
      apiClient.post('/students', { ...data, email: data.email || undefined, classId: data.classId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const removeStudent = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/students/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const columns: DataTableColumn<Student>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => {
        const label = r.user.email ?? r.user.civilId ?? r.admissionNumber;
        return (
          <Link href={`/students/${r.id}`} className="flex items-center gap-sm hover:opacity-80">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(label)}
            </span>
            <span>
              <span className="block font-medium text-foreground">{label}</span>
              <span className="block text-xs text-muted-foreground">{r.user.civilId ?? r.admissionNumber}</span>
            </span>
          </Link>
        );
      },
    },
    { key: 'admissionNumber', label: 'Student ID', render: (r) => r.admissionNumber },
    {
      key: 'class',
      label: 'Class',
      render: (r) => (
        <span className="rounded-full bg-muted px-sm py-0.5 text-xs font-medium text-muted-foreground">
          {r.class?.name ?? 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-sm py-0.5 text-xs font-medium ${
            r.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-success' : 'bg-destructive'}`} />
          {r.status === 'ACTIVE' ? 'Active' : r.status}
        </span>
      ),
    },
    {
      key: 'guardian',
      label: 'Parent Contact',
      render: (r) => {
        const guardian = r.guardians[0];
        if (!guardian) return <span className="text-muted-foreground">—</span>;
        return (
          <span>
            <span className="block text-foreground">{guardian.parent.user.phone ?? guardian.parent.user.email}</span>
            <span className="block text-xs uppercase text-muted-foreground">{guardian.relationship}</span>
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">Manage your student body and academic records</p>
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
            Add Student
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={studentsQuery.data ?? []}
        isLoading={studentsQuery.isLoading}
        error={studentsQuery.error ? (studentsQuery.error as Error).message : null}
        getSearchText={(r) => `${r.admissionNumber} ${r.user.civilId ?? ''} ${r.user.email ?? ''}`}
        searchPlaceholder="Search students…"
        rowActions={
          canWrite
            ? (r) => (
                <button
                  type="button"
                  onClick={() => confirm(`Withdraw ${r.admissionNumber}?`) && removeStudent.mutate(r.id)}
                  className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Withdraw ${r.admissionNumber}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            : undefined
        }
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Student">
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createStudent.mutate(data);
          })}
        >
          <FormField label="Civil ID (login)" htmlFor="civilId" error={errors.civilId?.message}>
            <input id="civilId" className={inputClass} {...register('civilId')} />
          </FormField>

          <FormField label="Email (optional)" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register('email')} />
          </FormField>

          <FormField label="Temporary password" htmlFor="password" error={errors.password?.message}>
            <input id="password" type="text" className={inputClass} {...register('password')} />
          </FormField>

          <FormField label="Admission number" htmlFor="admissionNumber" error={errors.admissionNumber?.message}>
            <input id="admissionNumber" className={inputClass} {...register('admissionNumber')} />
          </FormField>

          <FormField label="Class (optional)" htmlFor="classId">
            <select id="classId" className={inputClass} {...register('classId')}>
              <option value="">Unassigned</option>
              {classesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
