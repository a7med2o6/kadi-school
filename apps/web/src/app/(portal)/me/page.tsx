'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { UsersRound } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useAuthStore } from '@/stores/auth-store';

interface SelfStudent {
  id: string;
}
interface ChildStudent {
  id: string;
  admissionNumber: string;
  relationship: string;
  class: { name: string } | null;
  user: { email: string | null; civilId: string | null };
}

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function MyProfilePage() {
  const router = useRouter();
  const t = useTranslations();
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.roles.includes('Student') ?? false;
  const isParent = user?.roles.includes('Parent') ?? false;

  const selfQuery = useQuery({
    queryKey: ['students-me'],
    queryFn: () => apiClient.get<SelfStudent>('/students/me'),
    enabled: isStudent,
  });
  const childrenQuery = useQuery({
    queryKey: ['parents-me-children'],
    queryFn: () => apiClient.get<ChildStudent[]>('/parents/me/children'),
    enabled: isParent,
  });

  const children = childrenQuery.data ?? [];

  useEffect(() => {
    if (isStudent && selfQuery.data) {
      router.replace(`/students/${selfQuery.data.id}`);
    }
  }, [isStudent, selfQuery.data, router]);

  useEffect(() => {
    if (isParent && childrenQuery.data?.length === 1) {
      router.replace(`/students/${childrenQuery.data[0].id}`);
    }
  }, [isParent, childrenQuery.data, router]);

  if (isParent && !childrenQuery.isLoading && children.length > 1) {
    return (
      <div className="space-y-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.myProfile.selectChildTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.myProfile.selectChildSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => {
            const label = child.user.email ?? child.user.civilId ?? child.admissionNumber;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => router.push(`/students/${child.id}`)}
                className="flex cursor-pointer items-center gap-sm rounded-lg border border-border bg-card p-lg text-start shadow-ambient transition-colors hover:bg-accent"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {initials(label)}
                </span>
                <div>
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-xs capitalize text-muted-foreground">
                    {child.class?.name ?? child.admissionNumber} · {child.relationship}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (isParent && !childrenQuery.isLoading && children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3xl text-center shadow-ambient">
        <span className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UsersRound className="h-6 w-6" />
        </span>
        <p className="max-w-sm text-sm text-muted-foreground">{t.myProfile.noChildrenLinked}</p>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
}
