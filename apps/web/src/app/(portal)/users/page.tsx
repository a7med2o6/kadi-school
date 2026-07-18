'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SchoolUser {
  id: string;
  email: string | null;
  civilId: string | null;
  status: string;
  lastLoginAt: string | null;
}

export default function UsersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<SchoolUser[]>('/users'),
  });

  return (
    <div className="space-y-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-md py-sm font-medium">Email</th>
              <th className="px-md py-sm font-medium">Civil ID</th>
              <th className="px-md py-sm font-medium">Status</th>
              <th className="px-md py-sm font-medium">Last login</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-md py-md text-muted-foreground">
                  Loading…
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
                <td className="px-md py-sm text-foreground">{u.status}</td>
                <td className="px-md py-sm text-muted-foreground">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
