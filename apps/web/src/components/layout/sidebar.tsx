'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  Star,
  UserCircle,
  UsersRound,
  BookOpen,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';

interface NavItem {
  href: string;
  labelKey: keyof ReturnType<typeof useTranslations>['nav'];
  icon: typeof LayoutDashboard;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/attendance', labelKey: 'attendance', icon: CalendarCheck, permission: 'attendance:read' },
  { href: '/grades', labelKey: 'grades', icon: Star, permission: 'grades:read' },
  { href: '/assignments', labelKey: 'assignments', icon: ClipboardList, permission: 'homework:read' },
  { href: '/exams', labelKey: 'exams', icon: FileQuestion, permission: 'exams:read' },
  { href: '/notifications', labelKey: 'notifications', icon: Bell, permission: 'notifications:read' },
  { href: '/classes', labelKey: 'classes', icon: School, permission: 'classes:read' },
  { href: '/subjects', labelKey: 'subjects', icon: BookOpen, permission: 'subjects:read' },
  { href: '/timetable', labelKey: 'timetable', icon: CalendarDays, permission: 'timetable:read' },
  { href: '/teachers', labelKey: 'teachers', icon: GraduationCap, permission: 'teachers:read' },
  { href: '/students', labelKey: 'students', icon: UsersRound, permission: 'students:read' },
  { href: '/users', labelKey: 'users', icon: Users, permission: 'users:read' },
];

/**
 * Student/Parent accounts don't manage the school — they only ever need their
 * own (or their child's) record. Point them at /me instead of the staff-facing
 * class/subject-selector Attendance/Grades/Assignments/Exams pages.
 */
const SELF_SERVICE_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/me', labelKey: 'myProfile', icon: UserCircle },
  { href: '/notifications', labelKey: 'notifications', icon: Bell, permission: 'notifications:read' },
  { href: '/timetable', labelKey: 'timetable', icon: CalendarDays, permission: 'timetable:read' },
];

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const permissions = user?.permissions ?? [];
  const t = useTranslations();

  const isSelfServiceRole = user?.roles.some((r) => r === 'Student' || r === 'Parent') ?? false;
  const items = (isSelfServiceRole ? SELF_SERVICE_NAV_ITEMS : NAV_ITEMS).filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );
  const identity = user?.email ?? user?.civilId ?? '';
  const role = user?.roles[0] ?? 'User';

  async function handleLogout() {
    await apiClient.post('/auth/logout').catch(() => undefined);
    clear();
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-card">
      <div className="flex shrink-0 items-center gap-2 px-lg py-lg">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="h-6 w-6" />
        </span>
        <div>
          <div className="text-base font-bold leading-tight text-foreground">Kadi School</div>
          <div className="text-xs font-medium tracking-wide text-muted-foreground">{t.nav.adminPortal}</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-sm">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded px-md py-sm text-sm transition-colors ${
                isActive
                  ? 'bg-secondary font-medium text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.nav[item.labelKey]}
            </Link>
          );
        })}

        <div className="my-sm border-t border-border" />

        <Link
          href="/settings"
          className={`flex items-center gap-2 rounded px-md py-sm text-sm transition-colors ${
            pathname === '/settings'
              ? 'bg-secondary font-medium text-secondary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Settings className="h-4 w-4" />
          {t.nav.settings}
        </Link>
      </nav>

      <div className="m-sm flex shrink-0 items-center gap-2 rounded bg-muted p-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(identity) || 'U'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{identity}</div>
          <div className="truncate text-xs text-muted-foreground">{role}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label={t.common.logout}
          className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
