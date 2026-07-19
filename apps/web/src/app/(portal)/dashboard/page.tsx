'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  GraduationCap,
  Plus,
  School,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, hasPermission } from '@/stores/auth-store';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useLocaleStore } from '@/stores/locale-store';
import { interpolate } from '@/lib/i18n';

interface Student {
  id: string;
  createdAt: string;
  class: { name: string } | null;
  user: { email: string | null; civilId: string | null };
}
interface Teacher {
  id: string;
  createdAt: string;
  user: { email: string | null };
}
interface SchoolClass {
  id: string;
  name: string;
}
interface Subject {
  id: string;
}

const STAT_ICON_STYLES = [
  'bg-primary/10 text-primary',
  'bg-secondary/10 text-secondary',
  'bg-success/10 text-success',
  'bg-tertiary/10 text-tertiary',
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const t = useTranslations();
  const name = user?.email?.split('@')[0] ?? user?.civilId ?? 'there';

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t.dashboard.greetingMorning;
    if (hour < 18) return t.dashboard.greetingAfternoon;
    return t.dashboard.greetingEvening;
  }

  function relativeTime(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.round(hours / 24), 'day');
  }

  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });
  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => apiClient.get<Teacher[]>('/teachers') });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => apiClient.get<SchoolClass[]>('/classes') });
  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: () => apiClient.get<Subject[]>('/subjects') });

  const stats = [
    { label: t.dashboard.totalStudents, value: studentsQuery.data?.length, icon: GraduationCap },
    { label: t.dashboard.totalTeachers, value: teachersQuery.data?.length, icon: UsersRound },
    { label: t.dashboard.totalClasses, value: classesQuery.data?.length, icon: School },
    { label: t.dashboard.totalSubjects, value: subjectsQuery.data?.length, icon: BookOpen },
  ];

  const studentsByClass = (studentsQuery.data ?? []).reduce<Record<string, number>>((acc, s) => {
    const key = s.class?.name ?? t.students.unassigned;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxClassCount = Math.max(1, ...Object.values(studentsByClass));

  const recentActivity = [
    ...(studentsQuery.data ?? []).map((s) => ({
      text: interpolate(t.dashboard.enrolledText, { name: s.user.email ?? s.user.civilId ?? '' }),
      at: s.createdAt,
      icon: UserPlus,
    })),
    ...(teachersQuery.data ?? []).map((tc) => ({
      text: interpolate(t.dashboard.joinedText, { name: tc.user.email ?? '' }),
      at: tc.createdAt,
      icon: GraduationCap,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  const quickActions = [
    { href: '/students', label: t.students.addStudent, description: t.dashboard.addStudentDesc, icon: UserPlus, permission: 'students:write' },
    { href: '/teachers', label: t.teachers.addTeacher, description: t.dashboard.addTeacherDesc, icon: GraduationCap, permission: 'teachers:write' },
    { href: '/timetable', label: t.timetable.newSlot, description: t.dashboard.buildTimetableDesc, icon: CalendarPlus, permission: 'timetable:write' },
  ].filter((a) => hasPermission(a.permission));

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {greeting()}, {name} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {interpolate(t.dashboard.subtitle, {
              school: user?.schoolSlug ?? '',
              date: new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-lg shadow-ambient">
            <span className={`mb-md flex h-10 w-10 items-center justify-center rounded ${STAT_ICON_STYLES[i]}`}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div className="text-2xl font-bold text-foreground">{stat.value ?? '—'}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient lg:col-span-2">
          <h2 className="text-lg font-bold text-foreground">{t.dashboard.studentsByClass}</h2>
          <p className="mb-lg text-sm text-muted-foreground">{t.dashboard.currentEnrollment}</p>

          {Object.keys(studentsByClass).length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <BarChart3 className="mb-2 h-8 w-8" />
              <p className="text-sm">{t.dashboard.noStudentsYet}</p>
            </div>
          ) : (
            <div className="flex h-48 items-end gap-md">
              {Object.entries(studentsByClass).map(([className, count]) => (
                <div key={className} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{count}</span>
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${Math.max(8, (count / maxClassCount) * 100)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{className}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="text-lg font-bold text-foreground">{t.dashboard.gradeDistribution}</h2>
          <p className="mb-lg text-sm text-muted-foreground">{t.dashboard.weeklyOverview}</p>
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
            <CalendarClock className="mb-2 h-8 w-8" />
            <p className="text-sm">{t.dashboard.gradesPlaceholder}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <div className="space-y-md lg:col-span-2">
          <h2 className="text-lg font-bold text-foreground">{t.dashboard.quickActions}</h2>
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-md rounded-lg border border-border bg-card p-md shadow-ambient transition-colors hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium text-foreground">{action.label}</div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-lg font-bold text-foreground">{t.dashboard.recentActivity}</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.dashboard.noActivity}</p>
          ) : (
            <ul className="space-y-md">
              {recentActivity.map((item, i) => (
                <li key={i} className="flex items-start gap-sm">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(item.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
