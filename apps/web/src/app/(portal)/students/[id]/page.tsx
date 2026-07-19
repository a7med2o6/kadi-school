'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileText, GraduationCap, ReceiptText, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';
import { useLocaleStore } from '@/stores/locale-store';

interface Guardian {
  relationship: string;
  isPrimaryContact: boolean;
  parent: { user: { email: string | null; phone: string | null } };
}
interface StudentDetail {
  id: string;
  admissionNumber: string;
  status: string;
  dateOfBirth: string | null;
  gender: string | null;
  enrollmentDate: string;
  class: { name: string } | null;
  user: { email: string | null; civilId: string | null; phone: string | null };
  guardians: Guardian[];
}

const TABS = ['overview', 'grades', 'attendance', 'fees', 'documents'] as const;
type Tab = (typeof TABS)[number];

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);

  const { data: student, isLoading } = useQuery({
    queryKey: ['students', params.id],
    queryFn: () => apiClient.get<StudentDetail>(`/students/${params.id}`),
  });

  if (isLoading || !student) {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
  }

  const label = student.user.email ?? student.user.civilId ?? student.admissionNumber;
  const primaryGuardian = student.guardians.find((g) => g.isPrimaryContact) ?? student.guardians[0];
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  const TAB_LABELS: Record<Tab, string> = {
    overview: t.studentDetail.tabOverview,
    grades: t.studentDetail.tabGrades,
    attendance: t.studentDetail.tabAttendance,
    fees: t.studentDetail.tabFees,
    documents: t.studentDetail.tabDocuments,
  };

  return (
    <div className="space-y-lg">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/students" className="hover:text-foreground">
          {t.studentDetail.breadcrumb}
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
                student.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {student.status === 'ACTIVE' ? t.common.active : student.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-md text-sm text-muted-foreground">
            <span>{student.admissionNumber}</span>
            <span>{student.class?.name ?? t.students.unassigned}</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          title={t.common.comingSoon}
          className="cursor-not-allowed rounded border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
        >
          {t.studentDetail.editProfile}
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
                {t.studentDetail.personalInfo}
              </h2>
              <dl className="space-y-sm text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.studentDetail.dob}</dt>
                  <dd className="font-medium text-foreground">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString(dateLocale) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.studentDetail.gender}</dt>
                  <dd className="font-medium capitalize text-foreground">{student.gender ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.students.civilId}</dt>
                  <dd className="font-medium text-foreground">{student.user.civilId ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.studentDetail.enrolled}</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(student.enrollmentDate).toLocaleDateString(dateLocale)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.studentDetail.guardianInfo}
              </h2>
              {primaryGuardian ? (
                <div>
                  <div className="mb-sm flex items-center gap-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tertiary/10 text-xs font-semibold text-tertiary">
                      {initials(primaryGuardian.parent.user.email ?? '?')}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">{primaryGuardian.parent.user.email}</div>
                      <div className="text-xs capitalize text-muted-foreground">{primaryGuardian.relationship}</div>
                    </div>
                  </div>
                  {primaryGuardian.parent.user.phone && (
                    <div className="rounded border border-border px-sm py-1.5 text-sm text-foreground" dir="ltr">
                      {primaryGuardian.parent.user.phone}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.students.noGuardian}</p>
              )}
            </div>
          </div>

          <div className="space-y-lg lg:col-span-2">
            <div className="grid grid-cols-2 gap-md">
              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.studentDetail.gpaScore}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">{t.studentDetail.gpaPlaceholder}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.studentDetail.attendance}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">{t.studentDetail.attendancePlaceholder}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.studentDetail.activityTimeline}
              </h2>
              <div className="flex items-start gap-sm text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-foreground">
                    {student.class
                      ? interpolate(t.studentDetail.enrolledInClass, { class: student.class.name })
                      : t.studentDetail.enrolled}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(student.enrollmentDate).toLocaleDateString(dateLocale)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'grades' && <EmptyTab icon={TrendingUp} message={t.studentDetail.gradesEmpty} />}
      {tab === 'attendance' && <EmptyTab icon={GraduationCap} message={t.studentDetail.attendanceEmpty} />}
      {tab === 'fees' && <EmptyTab icon={ReceiptText} message={t.studentDetail.feesEmpty} />}
      {tab === 'documents' && <EmptyTab icon={FileText} message={t.studentDetail.documentsEmpty} />}
    </div>
  );
}

function EmptyTab({ icon: Icon, message }: { icon: typeof TrendingUp; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3xl text-center shadow-ambient">
      <span className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
