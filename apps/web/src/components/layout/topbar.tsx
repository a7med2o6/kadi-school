'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronDown, Plus, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useLocaleStore } from '@/stores/locale-store';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

const UNREAD_POLL_MS = 20_000;

interface InboxNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
interface InboxItem {
  id: string;
  readAt: string | null;
  notification: InboxNotification;
}

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const identity = user?.email ?? user?.civilId ?? '';
  const t = useTranslations();
  const queryClient = useQueryClient();
  const canSeeNotifications = hasPermission('notifications:read');

  const quickActions = [
    { href: '/students', label: t.students.addStudent, permission: 'students:write' },
    { href: '/teachers', label: t.teachers.addTeacher, permission: 'teachers:write' },
    { href: '/classes', label: t.classes.newClass, permission: 'classes:write' },
  ];
  const availableActions = quickActions.filter((a) => hasPermission(a.permission));

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
    enabled: canSeeNotifications,
    refetchInterval: UNREAD_POLL_MS,
  });
  const inboxQuery = useQuery({
    queryKey: ['notifications-inbox-preview'],
    queryFn: () => apiClient.get<InboxItem[]>('/notifications/inbox'),
    enabled: canSeeNotifications,
    refetchInterval: UNREAD_POLL_MS,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => apiClient.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox-preview'] });
    },
  });

  const unreadCount = unreadQuery.data?.count ?? 0;
  const recentItems = (inboxQuery.data ?? []).slice(0, 5);

  function relativeTime(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.round(hours / 24), 'day');
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-md border-b border-border bg-card px-lg">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t.common.searchPlaceholder}
          className="w-full rounded border border-input bg-background py-sm ps-9 pe-md text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="ms-auto flex items-center gap-md">
        <LanguageSwitcher />

        {availableActions.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickActionsOpen((v) => !v)}
              onBlur={() => setTimeout(() => setQuickActionsOpen(false), 150)}
              className="inline-flex cursor-pointer items-center gap-1 rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {t.common.quickActions}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {quickActionsOpen && (
              <div className="absolute end-0 top-full z-20 mt-1 w-48 rounded border border-border bg-popover py-1 shadow-ambient">
                {availableActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="block px-md py-sm text-sm text-popover-foreground transition-colors hover:bg-accent"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {canSeeNotifications && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((v) => !v)}
              onBlur={() => setTimeout(() => setBellOpen(false), 150)}
              aria-label={t.common.notifications}
              className="relative cursor-pointer rounded p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute end-1 top-1 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>
            {bellOpen && (
              <div className="absolute end-0 top-full z-20 mt-1 w-80 rounded border border-border bg-popover shadow-ambient">
                <div className="border-b border-border px-md py-sm text-sm font-semibold text-popover-foreground">
                  {t.notifications.myNotifications}
                </div>
                {recentItems.length === 0 ? (
                  <p className="px-md py-lg text-center text-sm text-muted-foreground">{t.notifications.noNotificationsYet}</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {recentItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseDown={() => !item.readAt && markReadMutation.mutate(item.notification.id)}
                          className="flex w-full cursor-pointer items-start gap-2 px-md py-sm text-start transition-colors hover:bg-accent"
                        >
                          {!item.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                          <span className={`min-w-0 flex-1 ${item.readAt ? 'ps-3.5' : ''}`}>
                            <span className="block truncate text-sm font-medium text-popover-foreground">
                              {item.notification.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{item.notification.body}</span>
                            <span className="block text-xs text-muted-foreground">{relativeTime(item.notification.createdAt)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/notifications"
                  className="block border-t border-border px-md py-sm text-center text-sm text-primary transition-colors hover:bg-accent"
                >
                  {t.notifications.viewAll}
                </Link>
              </div>
            )}
          </div>
        )}

        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(identity) || 'U'}
        </span>
      </div>
    </header>
  );
}
