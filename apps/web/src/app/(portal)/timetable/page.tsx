'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SchoolClass {
  id: string;
  name: string;
}
interface ClassSubjectOption {
  id: string;
  classId: string;
  subject: { name: string };
  teacher: { user: { email: string | null } } | null;
}
interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  classSubject: {
    classId: string;
    subject: { name: string };
    teacher: { user: { email: string | null } } | null;
  };
}

const slotSchema = z.object({
  classSubjectId: z.string().uuid('Select a subject'),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm'),
  room: z.string().optional(),
});
type SlotInput = z.infer<typeof slotSchema>;

export default function TimetablePage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const canWrite = hasPermission('timetable:write');

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => apiClient.get<SchoolClass[]>('/classes') });
  const classSubjectsQuery = useQuery({
    queryKey: ['class-subjects'],
    queryFn: () => apiClient.get<ClassSubjectOption[]>('/class-subjects'),
  });
  const slotsQuery = useQuery({
    queryKey: ['timetable-slots'],
    queryFn: () => apiClient.get<TimetableSlot[]>('/timetable-slots'),
  });

  const activeClassId = selectedClassId || classesQuery.data?.[0]?.id || '';
  const classSubjectsForClass = (classSubjectsQuery.data ?? []).filter((cs) => cs.classId === activeClassId);
  const slotsForClass = (slotsQuery.data ?? []).filter((s) => s.classSubject.classId === activeClassId);

  const timeRows = useMemo(() => {
    const set = new Set(slotsForClass.map((s) => `${s.startTime}-${s.endTime}`));
    return Array.from(set).sort();
  }, [slotsForClass]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SlotInput>({ resolver: zodResolver(slotSchema) });

  const createSlot = useMutation({
    mutationFn: (data: SlotInput) => apiClient.post('/timetable-slots', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-slots'] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const deleteSlot = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/timetable-slots/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable-slots'] }),
  });

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Timetable</h1>
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
            New Slot
          </button>
        )}
      </div>

      <div className="max-w-xs">
        <select
          value={activeClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className={inputClass}
        >
          {classesQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="whitespace-nowrap px-md py-sm font-medium">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="whitespace-nowrap px-md py-sm font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.length === 0 && (
              <tr>
                <td colSpan={DAYS.length + 1} className="px-md py-md text-muted-foreground">
                  No slots scheduled for this class yet
                </td>
              </tr>
            )}
            {timeRows.map((range) => (
              <tr key={range} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-md py-sm font-medium text-foreground">{range}</td>
                {DAYS.map((_, dayIndex) => {
                  const slot = slotsForClass.find((s) => `${s.startTime}-${s.endTime}` === range && s.dayOfWeek === dayIndex);
                  return (
                    <td key={dayIndex} className="px-md py-sm align-top">
                      {slot && (
                        <div className="rounded-md bg-accent p-2 text-xs">
                          <div className="font-medium text-accent-foreground">{slot.classSubject.subject.name}</div>
                          <div className="text-muted-foreground">{slot.classSubject.teacher?.user.email ?? 'No teacher'}</div>
                          {slot.room && <div className="text-muted-foreground">Room {slot.room}</div>}
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => deleteSlot.mutate(slot.id)}
                              className="mt-1 cursor-pointer text-muted-foreground hover:text-destructive"
                              aria-label="Delete slot"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Timetable Slot">
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createSlot.mutate(data);
          })}
        >
          <FormField label="Subject (for selected class)" htmlFor="classSubjectId" error={errors.classSubjectId?.message}>
            <select id="classSubjectId" className={inputClass} {...register('classSubjectId')}>
              <option value="">Select…</option>
              {classSubjectsForClass.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.subject.name} {cs.teacher ? `(${cs.teacher.user.email})` : '(no teacher)'}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Day" htmlFor="dayOfWeek" error={errors.dayOfWeek?.message}>
            <select id="dayOfWeek" className={inputClass} {...register('dayOfWeek')}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Start time" htmlFor="startTime" error={errors.startTime?.message}>
            <input id="startTime" type="time" className={inputClass} {...register('startTime')} />
          </FormField>

          <FormField label="End time" htmlFor="endTime" error={errors.endTime?.message}>
            <input id="endTime" type="time" className={inputClass} {...register('endTime')} />
          </FormField>

          <FormField label="Room (optional)" htmlFor="room">
            <input id="room" className={inputClass} {...register('room')} />
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
