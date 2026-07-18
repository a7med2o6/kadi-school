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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const STAT_ICON_STYLES = [
  'bg-primary/10 text-primary',
  'bg-secondary/10 text-secondary',
  'bg-success/10 text-success',
  'bg-tertiary/10 text-tertiary',
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const name = user?.email?.split('@')[0] ?? user?.civilId ?? 'there';

  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => apiClient.get<Student[]>('/students') });
  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => apiClient.get<Teacher[]>('/teachers') });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => apiClient.get<SchoolClass[]>('/classes') });
  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: () => apiClient.get<Subject[]>('/subjects') });

  const stats = [
    { label: 'Total Students', value: studentsQuery.data?.length, icon: GraduationCap },
    { label: 'Total Teachers', value: teachersQuery.data?.length, icon: UsersRound },
    { label: 'Total Classes', value: classesQuery.data?.length, icon: School },
    { label: 'Total Subjects', value: subjectsQuery.data?.length, icon: BookOpen },
  ];

  const studentsByClass = (studentsQuery.data ?? []).reduce<Record<string, number>>((acc, s) => {
    const key = s.class?.name ?? 'Unassigned';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxClassCount = Math.max(1, ...Object.values(studentsByClass));

  const recentActivity = [
    ...(studentsQuery.data ?? []).map((s) => ({
      text: `New student ${s.user.email ?? s.user.civilId} was enrolled`,
      at: s.createdAt,
      icon: UserPlus,
    })),
    ...(teachersQuery.data ?? []).map((t) => ({
      text: `New teacher ${t.user.email} joined`,
      at: t.createdAt,
      icon: GraduationCap,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  const quickActions = [
    { href: '/students', label: 'Add Student', description: 'Enroll a new student to a class', icon: UserPlus, permission: 'students:write' },
    { href: '/teachers', label: 'Add Teacher', description: 'Onboard a new staff member', icon: GraduationCap, permission: 'teachers:write' },
    { href: '/timetable', label: 'Build Timetable', description: 'Schedule classes for the week', icon: CalendarPlus, permission: 'timetable:write' },
  ].filter((a) => hasPermission(a.permission));

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {greeting()}, {name} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at {user?.schoolSlug} today,{' '}
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
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
          <h2 className="text-lg font-bold text-foreground">Students by Class</h2>
          <p className="mb-lg text-sm text-muted-foreground">Current enrollment distribution</p>

          {Object.keys(studentsByClass).length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <BarChart3 className="mb-2 h-8 w-8" />
              <p className="text-sm">No students enrolled yet</p>
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
          <h2 className="text-lg font-bold text-foreground">Grade Distribution</h2>
          <p className="mb-lg text-sm text-muted-foreground">Weekly performance overview</p>
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
            <CalendarClock className="mb-2 h-8 w-8" />
            <p className="text-sm">Grades will appear once exams are recorded</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <div className="space-y-md lg:col-span-2">
          <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
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
          <h2 className="mb-md text-lg font-bold text-foreground">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet — activity shows up here as your school fills in.</p>
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
