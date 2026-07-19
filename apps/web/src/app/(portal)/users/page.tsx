'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useLocaleStore } from '@/stores/locale-store';

interface SchoolUser {
  id: string;
  email: string | null;
  civilId: string | null;
  status: string;
  lastLoginAt: string | null;
}

export default function UsersPage() {
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<SchoolUser[]>('/users'),
  });

  return (
    <div className="space-y-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.users.title}</h1>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-md py-sm text-start font-medium">{t.users.email}</th>
              <th className="px-md py-sm text-start font-medium">{t.users.civilId}</th>
              <th className="px-md py-sm text-start font-medium">{t.users.status}</th>
              <th className="px-md py-sm text-start font-medium">{t.users.lastLogin}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-md py-md text-muted-foreground">
                  {t.common.loading}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={4} className="px-md py-md text-destructive">
                  {(error as Error).message}
                </td>
              </tr>
            )}
            {data?.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-md py-sm text-foreground">{u.email ?? '—'}</td>
                <td className="px-md py-sm text-foreground">{u.civilId ?? '—'}</td>
                <td className="px-md py-sm text-foreground">
                  {u.status === 'ACTIVE' ? t.common.active : t.common.inactive}
                </td>
                <td className="px-md py-sm text-muted-foreground">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') : t.users.never}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
