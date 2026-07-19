'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, BookOpen, CalendarClock, ChevronRight, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from '@/lib/i18n/use-translations';

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
}
interface ClassSubject {
  id: string;
  subject: { name: string };
  class: { name: string };
  timetableSlots: TimetableSlot[];
}
interface TeacherDetail {
  id: string;
  employeeNumber: string;
  hireDate: string;
  employmentType: string;
  department: string | null;
  user: { email: string | null; phone: string | null; status: string };
  classSubjects: ClassSubject[];
}

const TABS = ['overview', 'schedule', 'performance', 'documents'] as const;
type Tab = (typeof TABS)[number];

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const t = useTranslations();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teachers', params.id],
    queryFn: () => apiClient.get<TeacherDetail>(`/teachers/${params.id}`),
  });

  if (isLoading || !teacher) {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
  }

  const label = teacher.user.email ?? teacher.employeeNumber;

  const slots = teacher.classSubjects
    .flatMap((cs) => cs.timetableSlots.map((slot) => ({ ...slot, subject: cs.subject.name, class: cs.class.name })))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  const TAB_LABELS: Record<Tab, string> = {
    overview: t.teacherDetail.tabOverview,
    schedule: t.teacherDetail.tabSchedule,
    performance: t.teacherDetail.tabPerformance,
    documents: t.teacherDetail.tabDocuments,
  };

  return (
    <div className="space-y-lg">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/teachers" className="hover:text-foreground">
          {t.teacherDetail.breadcrumb}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="font-medium text-foreground">{label}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-md rounded-lg border border-border bg-card p-lg shadow-ambient">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
          {initials(label)}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{label}</h1>
            <span
              className={`rounded-full px-sm py-0.5 text-xs font-medium ${
                teacher.user.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {teacher.user.status === 'ACTIVE' ? t.common.active : t.common.inactive}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-md text-sm text-muted-foreground">
            <span>{teacher.employeeNumber}</span>
            <span>{teacher.department ?? '—'}</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          title={t.common.comingSoon}
          className="cursor-not-allowed rounded border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
        >
          {t.teacherDetail.editProfile}
        </button>
      </div>

      <div className="flex gap-lg border-b border-border">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`cursor-pointer border-b-2 pb-sm text-sm font-medium transition-colors ${
              tab === tb ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_LABELS[tb]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
          <div className="space-y-lg lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.teacherDetail.contactInfo}
              </h2>
              <dl className="space-y-sm text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.teachers.email}</dt>
                  <dd className="font-medium text-foreground">{teacher.user.email ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.common.phone}</dt>
                  <dd className="font-medium text-foreground">{teacher.user.phone ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.teacherDetail.employmentInfo}
              </h2>
              <dl className="space-y-sm text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.teacherDetail.hireDate}</dt>
                  <dd className="font-medium text-foreground">{new Date(teacher.hireDate).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.teacherDetail.employmentType}</dt>
                  <dd className="font-medium capitalize text-foreground">{teacher.employmentType.replace('_', ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.teacherDetail.department}</dt>
                  <dd className="font-medium text-foreground">{teacher.department ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-lg lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.teacherDetail.subjectsTaught}
              </h2>
              {teacher.classSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.teacherDetail.noSubjectsTaught}</p>
              ) : (
                <ul className="space-y-sm">
                  {teacher.classSubjects.map((cs) => (
                    <li
                      key={cs.id}
                      className="flex items-center gap-sm rounded-md border border-border px-md py-sm text-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary/10 text-secondary">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-foreground">{cs.subject.name}</span>
                      <span className="text-muted-foreground">· {cs.class.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
          <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.teacherDetail.weeklySchedule}
          </h2>
          {slots.length === 0 ? (
            <EmptyTab icon={CalendarClock} message={t.teacherDetail.noScheduleYet} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.timetable.day}</th>
                    <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.timetable.time}</th>
                    <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.subjects.title}</th>
                    <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.classes.title}</th>
                    <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.classes.room}</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-md py-sm text-foreground">{t.timetable.days[slot.dayOfWeek]}</td>
                      <td className="whitespace-nowrap px-md py-sm text-foreground">
                        <span dir="ltr">
                          {slot.startTime}–{slot.endTime}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-md py-sm text-foreground">{slot.subject}</td>
                      <td className="whitespace-nowrap px-md py-sm text-foreground">{slot.class}</td>
                      <td className="whitespace-nowrap px-md py-sm text-foreground">{slot.room ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'performance' && <EmptyTab icon={BarChart3} message={t.teacherDetail.performanceEmpty} />}
      {tab === 'documents' && <EmptyTab icon={FileText} message={t.teacherDetail.documentsEmpty} />}
    </div>
  );
}

function EmptyTab({ icon: Icon, message }: { icon: typeof BarChart3; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3xl text-center shadow-ambient">
      <span className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
