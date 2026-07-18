'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, type SessionUser } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

/**
 * The access token lives only in memory, so a hard page reload loses it. On
 * mount, if there's no session yet, try a silent refresh — the browser sends
 * the httpOnly refresh cookie automatically — before deciding the user is
 * actually logged out.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user) {
      setChecked(true);
      return;
    }

    apiClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then(async ({ accessToken }) => {
        useAuthStore.getState().setAccessToken(accessToken);
        const freshUser = await apiClient.get<SessionUser>('/auth/me');
        setSession(accessToken, freshUser);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => setChecked(true));
    // Only re-run if the user identity itself changes (login/logout), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!checked || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-background p-lg">{children}</main>
      </div>
    </div>
  );
}
