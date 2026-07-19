'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';
import { useLocaleStore } from '@/stores/locale-store';

interface Role {
  id: string;
  name: string;
}
interface SchoolClass {
  id: string;
  name: string;
}
interface SchoolUser {
  id: string;
  email: string | null;
  civilId: string | null;
}
interface NotificationSummary {
  id: string;
  title: string;
  body: string;
  targetType: 'ROLE' | 'CLASS' | 'INDIVIDUAL';
  targetClass: SchoolClass | null;
  createdAt: string;
  createdByUser: { email: string | null } | null;
  _count: { recipients: number };
}
interface InboxItem {
  id: string;
  readAt: string | null;
  notification: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    createdByUser: { email: string | null } | null;
  };
}

const composeSchema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(1, 'Required'),
  targetType: z.enum(['ROLE', 'CLASS', 'INDIVIDUAL']),
  targetRoleId: z.string().optional(),
  targetClassId: z.string().optional(),
  targetUserId: z.string().optional(),
});
type ComposeInput = z.infer<typeof composeSchema>;

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function NotificationsPage() {
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const canWrite = hasPermission('notifications:write');
  const [composeOpen, setComposeOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  const inboxQuery = useQuery({
    queryKey: ['notifications-inbox'],
    queryFn: () => apiClient.get<InboxItem[]>('/notifications/inbox'),
  });
  const sentQuery = useQuery({
    queryKey: ['notifications-sent'],
    queryFn: () => apiClient.get<NotificationSummary[]>('/notifications'),
    enabled: canWrite,
  });
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<Role[]>('/roles'),
    enabled: canWrite,
  });
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiClient.get<SchoolClass[]>('/classes'),
    enabled: canWrite,
  });
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<SchoolUser[]>('/users'),
    enabled: canWrite,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => apiClient.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox-preview'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox-preview'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ComposeInput>({ resolver: zodResolver(composeSchema), defaultValues: { targetType: 'ROLE' } });
  const targetType = watch('targetType');

  const composeMutation = useMutation({
    mutationFn: (data: ComposeInput) => apiClient.post('/notifications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-sent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox-preview'] });
      setComposeOpen(false);
      reset({ targetType: 'ROLE' });
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  const hasUnread = (inboxQuery.data ?? []).some((i) => !i.readAt);

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.notifications.title}</h1>
          <p className="text-sm text-muted-foreground">{t.notifications.subtitle}</p>
        </div>
        <div className="flex gap-sm">
          {hasUnread && (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Check className="h-4 w-4" />
              {t.notifications.markAllRead}
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setComposeOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {t.notifications.newAnnouncement}
            </button>
          )}
        </div>
      </div>

      {canWrite && (
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-lg font-bold text-foreground">{t.notifications.recentlySent}</h2>
          {sentQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}
          {!sentQuery.isLoading && (sentQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t.notifications.noSentYet}</p>
          )}
          <ul className="space-y-sm">
            {(sentQuery.data ?? []).slice(0, 5).map((n) => (
              <li key={n.id} className="rounded-md border border-border p-md text-sm">
                <div className="flex items-start justify-between gap-sm">
                  <span className="font-medium text-foreground">{n.title}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {interpolate(t.notifications.sentTo, { count: n._count.recipients })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
        <h2 className="mb-md text-lg font-bold text-foreground">{t.notifications.myNotifications}</h2>
        {inboxQuery.isLoading && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}
        {!inboxQuery.isLoading && (inboxQuery.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">{t.notifications.noNotificationsYet}</p>
        )}
        <ul className="space-y-sm">
          {(inboxQuery.data ?? []).map((item) => {
            const senderLabel = item.notification.createdByUser?.email ?? '';
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => !item.readAt && markReadMutation.mutate(item.notification.id)}
                  className={`flex w-full cursor-pointer items-start gap-sm rounded-md border p-md text-start transition-colors hover:bg-accent ${
                    item.readAt ? 'border-border' : 'border-primary/40 bg-primary/5'
                  }`}
                >
                  {senderLabel && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
                      {initials(senderLabel)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {!item.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      <span className="font-medium text-foreground">{item.notification.title}</span>
                    </span>
                    <span className="block text-sm text-muted-foreground">{item.notification.body}</span>
                    <span className="block text-xs text-muted-foreground">
                      {senderLabel && `${t.notifications.from} ${senderLabel} · `}
                      {new Date(item.notification.createdAt).toLocaleString(dateLocale)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} title={t.notifications.composeTitle}>
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            composeMutation.mutate(data);
          })}
        >
          <FormField label={t.notifications.titleLabel} htmlFor="title" error={errors.title?.message}>
            <input id="title" className={inputClass} {...register('title')} />
          </FormField>

          <FormField label={t.notifications.bodyLabel} htmlFor="body" error={errors.body?.message}>
            <textarea id="body" rows={3} className={inputClass} {...register('body')} />
          </FormField>

          <FormField label={t.notifications.targetType} htmlFor="targetType">
            <select id="targetType" className={inputClass} {...register('targetType')}>
              <option value="ROLE">{t.notifications.targetRole}</option>
              <option value="CLASS">{t.notifications.targetClass}</option>
              <option value="INDIVIDUAL">{t.notifications.targetIndividual}</option>
            </select>
          </FormField>

          {targetType === 'ROLE' && (
            <FormField label={t.notifications.selectRole} htmlFor="targetRoleId" error={errors.targetRoleId?.message}>
              <select id="targetRoleId" className={inputClass} {...register('targetRoleId')}>
                <option value="">…</option>
                {rolesQuery.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {targetType === 'CLASS' && (
            <FormField label={t.notifications.selectClass} htmlFor="targetClassId" error={errors.targetClassId?.message}>
              <select id="targetClassId" className={inputClass} {...register('targetClassId')}>
                <option value="">…</option>
                {classesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {targetType === 'INDIVIDUAL' && (
            <FormField label={t.notifications.selectUser} htmlFor="targetUserId" error={errors.targetUserId?.message}>
              <select id="targetUserId" className={inputClass} {...register('targetUserId')}>
                <option value="">…</option>
                {usersQuery.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email ?? u.civilId}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {serverError && <p className="mb-md text-sm text-destructive">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t.common.creating : t.notifications.send}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
