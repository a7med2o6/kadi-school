'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, Plus, Search } from 'lucide-react';
import { useAuthStore, hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

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
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const identity = user?.email ?? user?.civilId ?? '';
  const t = useTranslations();

  const quickActions = [
    { href: '/students', label: t.students.addStudent, permission: 'students:write' },
    { href: '/teachers', label: t.teachers.addTeacher, permission: 'teachers:write' },
    { href: '/classes', label: t.classes.newClass, permission: 'classes:write' },
  ];
  const availableActions = quickActions.filter((a) => hasPermission(a.permission));

  return (
    <header className="flex h-16 items-center gap-md border-b border-border bg-card px-lg">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t.common.searchPlaceholder}
          className="w-full rounded border border-input bg-background py-sm ps-9 pe-md text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="flex items-center gap-md">
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

        <button
          type="button"
          aria-label={t.common.notifications}
          className="cursor-pointer rounded p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>

        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(identity) || 'U'}
        </span>
      </div>
    </header>
  );
}
