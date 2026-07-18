'use client';

import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>

      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
        <h2 className="mb-sm text-sm font-medium text-muted-foreground">Signed in as</h2>
        <p className="text-foreground">{user?.email ?? user?.civilId}</p>
        <p className="text-sm text-muted-foreground">{user?.schoolSlug}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
        <h2 className="mb-sm text-sm font-medium text-muted-foreground">Roles</h2>
        <div className="flex flex-wrap gap-2">
          {user?.roles.map((role) => (
            <span key={role} className="rounded-full bg-primary/10 px-sm py-1 text-xs font-medium text-primary">
              {role}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
        <h2 className="mb-sm text-sm font-medium text-muted-foreground">Permissions</h2>
        <div className="flex flex-wrap gap-2">
          {user?.permissions.map((permission) => (
            <span
              key={permission}
              className="rounded-full bg-muted px-sm py-1 text-xs font-medium text-muted-foreground"
            >
              {permission}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
