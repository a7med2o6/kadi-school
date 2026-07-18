'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    await apiClient.post('/auth/logout').catch(() => undefined);
    clear();
    router.push('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-lg">
      <span className="text-sm text-muted-foreground">{user?.schoolSlug}</span>
      <div className="flex items-center gap-md">
        <span className="text-sm text-foreground">{user?.email ?? user?.civilId}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-sm py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
