'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileQuestion,
  FileText,
  GraduationCap,
  MessageSquare,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { apiClient, ApiError, downloadAuthenticated, getApiOrigin } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { FormField, inputClass } from '@/components/ui/form-field';
import { useTranslations } from '@/lib/i18n/use-translations';
import { interpolate } from '@/lib/i18n';
import { useLocaleStore } from '@/stores/locale-store';
import { hasPermission } from '@/stores/auth-store';

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
  nationality: string | null;
  busRoute: string | null;
  enrollmentDate: string;
  class: { id: string; name: string } | null;
  user: { email: string | null; civilId: string | null; phone: string | null; avatarUrl: string | null };
  guardians: Guardian[];
}
interface SchoolClass {
  id: string;
  name: string;
}

type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
interface InvoicePayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  referenceNumber: string | null;
}
interface FeeInvoice {
  id: string;
  title: string;
  amountDue: string;
  dueDate: string;
  status: FeeStatus;
  payments: InvoicePayment[];
}
interface StudentDocumentRow {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  uploadedByUser: { email: string | null } | null;
}

const editProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.union([z.enum(['male', 'female']), z.literal('')]).optional(),
  nationality: z.string().optional(),
  busRoute: z.string().optional(),
  classId: z.string().optional(),
});
type EditProfileInput = z.infer<typeof editProfileSchema>;

const feeInvoiceSchema = z.object({
  title: z.string().min(1, 'Required'),
  amountDue: z.coerce.number().positive('Must be positive'),
  dueDate: z.string().min(1, 'Required'),
});
type FeeInvoiceInput = z.infer<typeof feeInvoiceSchema>;

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  referenceNumber: z.string().optional(),
});
type PaymentInput = z.infer<typeof paymentSchema>;

const documentSchema = z.object({
  title: z.string().min(1, 'Required'),
});
type DocumentInput = z.infer<typeof documentSchema>;

type GradeComponent = 'QUIZZES' | 'MIDTERM' | 'FINAL' | 'PARTICIPATION';
const GRADE_COMPONENTS: GradeComponent[] = ['QUIZZES', 'MIDTERM', 'FINAL', 'PARTICIPATION'];
const GRADE_MAX: Record<GradeComponent, number> = { QUIZZES: 20, MIDTERM: 20, FINAL: 40, PARTICIPATION: 20 };
interface StudentGradeRow {
  id: string;
  studentId: string;
  classSubjectId: string;
  component: GradeComponent;
  score: number;
  updatedAt: string;
  classSubject: { subject: { name: string }; class: { name: string } };
}
interface Assignment {
  id: string;
  title: string;
  dueAt: string;
  classSubject: { classId: string; subject: { name: string } };
  submissions: { studentId: string; submittedAt: string | null }[];
}

type AttendanceStatusValue = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatusValue;
  arrivalTime: string | null;
  note: string | null;
}
interface AttendanceNote {
  id: string;
  body: string;
  createdAt: string;
  authorUser: { email: string | null } | null;
}
interface ExamScheduleRow {
  id: string;
  name: string;
  examType: string;
  examDate: string;
  subject: { name: string };
  class: { name: string } | null;
}

const TABS = ['overview', 'grades', 'attendance', 'exams', 'fees', 'documents'] as const;
type Tab = (typeof TABS)[number];

const STATUS_DOT: Record<AttendanceStatusValue, string> = {
  PRESENT: 'bg-success/15 text-success',
  LATE: 'bg-tertiary/15 text-tertiary',
  ABSENT: 'bg-destructive/15 text-destructive',
  EXCUSED: 'bg-secondary/15 text-secondary',
};

type ActivityType = 'enrollment' | 'attendance' | 'grade' | 'submission' | 'note';
interface ActivityEvent {
  id: string;
  date: string;
  type: ActivityType;
  label: string;
}
const ACTIVITY_ICON: Record<ActivityType, typeof TrendingUp> = {
  enrollment: GraduationCap,
  attendance: CalendarCheck,
  grade: TrendingUp,
  submission: ClipboardCheck,
  note: MessageSquare,
};

function initials(label: string) {
  return label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), year: y, monthIndex: m - 1 };
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [noteBody, setNoteBody] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const canWrite = hasPermission('attendance:write');
  const canEditProfile = hasPermission('students:write');
  const canViewFees = hasPermission('finance:read');
  const canManageFees = hasPermission('finance:write');
  const canRecordPayment = hasPermission('payments:create');
  const canViewDocuments = hasPermission('documents:read');
  const canManageDocuments = hasPermission('documents:write');
  const canViewExams = hasPermission('exams:read');

  const {
    data: student,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['students', params.id],
    queryFn: () => apiClient.get<StudentDetail>(`/students/${params.id}`),
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiClient.get<SchoolClass[]>('/classes'),
    enabled: canEditProfile,
  });
  const feesQuery = useQuery({
    queryKey: ['invoices', params.id],
    queryFn: () => apiClient.get<FeeInvoice[]>(`/invoices?studentId=${params.id}`),
    enabled: !!params.id && canViewFees,
  });
  const documentsQuery = useQuery({
    queryKey: ['documents', params.id],
    queryFn: () => apiClient.get<StudentDocumentRow[]>(`/documents?studentId=${params.id}`),
    enabled: !!params.id && canViewDocuments,
  });
  const examsQuery = useQuery({
    queryKey: ['exams-schedule', student?.class?.id],
    queryFn: () => apiClient.get<ExamScheduleRow[]>(`/exams/schedule?classId=${student?.class?.id}`),
    enabled: !!student?.class?.id && canViewExams,
  });

  const { start, end } = monthRange(reportMonth);
  const attendanceQuery = useQuery({
    queryKey: ['attendance-students', params.id, reportMonth],
    queryFn: () => apiClient.get<AttendanceRecord[]>(`/attendance/students?studentId=${params.id}&from=${start}&to=${end}`),
    enabled: !!params.id,
  });
  const notesQuery = useQuery({
    queryKey: ['attendance-notes', params.id],
    queryFn: () => apiClient.get<AttendanceNote[]>(`/attendance/notes?studentId=${params.id}`),
    enabled: !!params.id,
  });
  const gradesQuery = useQuery({
    queryKey: ['grades', 'term-1'],
    queryFn: () => apiClient.get<StudentGradeRow[]>('/grades?term=1'),
  });
  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: () => apiClient.get<Assignment[]>('/assignments'),
  });
  const allAttendanceQuery = useQuery({
    queryKey: ['attendance-students-all', params.id],
    queryFn: () => apiClient.get<AttendanceRecord[]>(`/attendance/students?studentId=${params.id}`),
    enabled: !!params.id,
  });
  const allGradesQuery = useQuery({
    queryKey: ['grades', 'all', params.id],
    queryFn: () => apiClient.get<StudentGradeRow[]>(`/grades?studentId=${params.id}`),
    enabled: !!params.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: (body: string) => apiClient.post('/attendance/notes', { studentId: params.id, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-notes', params.id] });
      setNoteBody('');
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<EditProfileInput>({ resolver: zodResolver(editProfileSchema) });

  const {
    register: registerFee,
    handleSubmit: handleFeeSubmit,
    reset: resetFeeForm,
    formState: { errors: feeErrors },
  } = useForm<FeeInvoiceInput>({ resolver: zodResolver(feeInvoiceSchema) });

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPaymentForm,
    formState: { errors: paymentErrors },
  } = useForm<PaymentInput>({ resolver: zodResolver(paymentSchema), defaultValues: { method: 'CASH' } });

  const {
    register: registerDoc,
    handleSubmit: handleDocSubmit,
    reset: resetDocForm,
    formState: { errors: docErrors },
  } = useForm<DocumentInput>({ resolver: zodResolver(documentSchema) });

  const updateProfileMutation = useMutation({
    mutationFn: (data: EditProfileInput) =>
      apiClient.patch(`/students/${params.id}`, {
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
        nationality: data.nationality || undefined,
        busRoute: data.busRoute || undefined,
        classId: data.classId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', params.id] });
      setEditDialogOpen(false);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.upload(`/students/${params.id}/avatar`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', params.id] }),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: FeeInvoiceInput) => apiClient.post('/invoices', { studentId: params.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', params.id] });
      setFeeDialogOpen(false);
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: PaymentInput }) =>
      apiClient.post(`/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', params.id] });
      setPayInvoiceId(null);
      resetPaymentForm({ amount: undefined, method: 'CASH', referenceNumber: '' });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ title, file }: { title: string; file: File }) => {
      const formData = new FormData();
      formData.append('studentId', params.id);
      formData.append('title', title);
      formData.append('file', file);
      return apiClient.upload('/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', params.id] });
      setDocDialogOpen(false);
      setDocFile(null);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', params.id] }),
  });

  const records = attendanceQuery.data ?? [];
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const lateDays = records.filter((r) => r.status === 'LATE').length;
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const schoolDays = records.length;
  const attendanceRate = schoolDays > 0 ? Math.round(((presentDays + lateDays) / schoolDays) * 100) : null;

  if (isError) {
    return <p className="text-sm text-destructive">{t.common.accessDenied}</p>;
  }

  if (isLoading || !student) {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
  }

  const allGrades = gradesQuery.data ?? [];
  const studentGrades = allGrades.filter((g) => g.studentId === student.id);
  const subjectIds = Array.from(new Set(studentGrades.map((g) => g.classSubjectId)));

  const subjectBreakdown = subjectIds.map((classSubjectId) => {
    const rowsForSubject = studentGrades.filter((g) => g.classSubjectId === classSubjectId);
    const scores = {} as Record<GradeComponent, number | null>;
    for (const c of GRADE_COMPONENTS) scores[c] = rowsForSubject.find((g) => g.component === c)?.score ?? null;
    const total = GRADE_COMPONENTS.reduce((sum, c) => sum + (scores[c] ?? 0), 0);
    const subjectName = rowsForSubject[0]?.classSubject.subject.name ?? '';

    const classmateTotals = new Map<string, number>();
    for (const g of allGrades.filter((g) => g.classSubjectId === classSubjectId)) {
      classmateTotals.set(g.studentId, (classmateTotals.get(g.studentId) ?? 0) + g.score);
    }
    const classAverageForSubject =
      classmateTotals.size > 0 ? Array.from(classmateTotals.values()).reduce((a, b) => a + b, 0) / classmateTotals.size : null;

    return { classSubjectId, subjectName, scores, total, classAverageForSubject };
  });

  const studentAverage =
    subjectBreakdown.length > 0 ? Math.round(subjectBreakdown.reduce((sum, s) => sum + s.total, 0) / subjectBreakdown.length) : null;
  const classAveragesWithData = subjectBreakdown.map((s) => s.classAverageForSubject).filter((v): v is number => v !== null);
  const classAverage =
    classAveragesWithData.length > 0 ? Math.round(classAveragesWithData.reduce((a, b) => a + b, 0) / classAveragesWithData.length) : null;

  const latestGrades = [...studentGrades].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  const upcomingTasks = (assignmentsQuery.data ?? [])
    .filter((a) => a.classSubject.classId === student.class?.id)
    .filter((a) => new Date(a.dueAt).getTime() > Date.now())
    .filter((a) => !a.submissions.some((s) => s.studentId === student.id && s.submittedAt))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 3);

  const GRADE_LABEL_KEY: Record<GradeComponent, 'quizzes' | 'midterm' | 'final' | 'participation'> = {
    QUIZZES: 'quizzes',
    MIDTERM: 'midterm',
    FINAL: 'final',
    PARTICIPATION: 'participation',
  };

  const activityEvents: ActivityEvent[] = [
    {
      id: 'enrollment',
      date: student.enrollmentDate,
      type: 'enrollment' as const,
      label: student.class
        ? interpolate(t.studentDetail.enrolledInClass, { class: student.class.name })
        : t.studentDetail.enrolled,
    },
    ...(allAttendanceQuery.data ?? []).map((r) => ({
      id: `att-${r.id}`,
      date: r.date,
      type: 'attendance' as const,
      label: interpolate(t.studentDetail.activityAttendanceLabel, { status: t.attendanceStatus[r.status] }),
    })),
    ...(allGradesQuery.data ?? []).map((g) => ({
      id: `grade-${g.id}`,
      date: g.updatedAt,
      type: 'grade' as const,
      label: interpolate(t.studentDetail.activityGradeLabel, {
        component: t.grades[GRADE_LABEL_KEY[g.component]],
        subject: g.classSubject.subject.name,
      }),
    })),
    ...(assignmentsQuery.data ?? [])
      .flatMap((a) => a.submissions.filter((s) => s.studentId === student.id && s.submittedAt).map((s) => ({ a, s })))
      .map(({ a, s }) => ({
        id: `sub-${a.id}`,
        date: s.submittedAt as string,
        type: 'submission' as const,
        label: interpolate(t.studentDetail.activitySubmissionLabel, { title: a.title }),
      })),
    ...(notesQuery.data ?? []).map((n) => ({
      id: `note-${n.id}`,
      date: n.createdAt,
      type: 'note' as const,
      label: t.studentDetail.activityNoteLabel,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const label = student.user.email ?? student.user.civilId ?? student.admissionNumber;
  const primaryGuardian = student.guardians.find((g) => g.isPrimaryContact) ?? student.guardians[0];
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  const TAB_LABELS: Record<Tab, string> = {
    overview: t.studentDetail.tabOverview,
    grades: t.studentDetail.tabGrades,
    attendance: t.studentDetail.tabAttendance,
    exams: t.studentDetail.tabExams,
    fees: t.studentDetail.tabFees,
    documents: t.studentDetail.tabDocuments,
  };

  const apiOrigin = getApiOrigin();
  const feeInvoices = feesQuery.data ?? [];
  const invoicePaidTotal = (f: FeeInvoice) => f.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalDue = feeInvoices
    .filter((f) => f.status !== 'PAID')
    .reduce((sum, f) => sum + (parseFloat(f.amountDue) - invoicePaidTotal(f)), 0);
  const totalPaid = feeInvoices.reduce((sum, f) => sum + invoicePaidTotal(f), 0);
  const FEE_STATUS_BADGE: Record<FeeStatus, string> = {
    PENDING: 'bg-tertiary/10 text-tertiary',
    PARTIAL: 'bg-primary/10 text-primary',
    PAID: 'bg-success/10 text-success',
    OVERDUE: 'bg-destructive/10 text-destructive',
  };
  const FEE_STATUS_LABEL: Record<FeeStatus, string> = {
    PENDING: t.studentDetail.feesStatusPending,
    PARTIAL: t.studentDetail.feesStatusPartial,
    PAID: t.studentDetail.feesStatusPaid,
    OVERDUE: t.studentDetail.feesStatusOverdue,
  };
  const payingInvoice = feeInvoices.find((f) => f.id === payInvoiceId) ?? null;
  const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: t.finance.methodCash,
    BANK_TRANSFER: t.finance.methodBankTransfer,
    CARD: t.finance.methodCard,
    OTHER: t.finance.methodOther,
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
        <div className="relative h-16 w-16 shrink-0">
          {student.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external upload, not part of the Next.js image pipeline
            <img
              src={`${apiOrigin}${student.user.avatarUrl}`}
              alt={label}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
              {initials(label)}
            </span>
          )}
          {canEditProfile && (
            <>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarMutation.isPending}
                title={t.studentDetail.changePhoto}
                className="absolute -bottom-1 -end-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-ambient transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) avatarMutation.mutate(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
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
        {canEditProfile ? (
          <button
            type="button"
            onClick={() => {
              resetEditForm({
                dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
                gender: (student.gender as 'male' | 'female' | '') ?? '',
                nationality: student.nationality ?? '',
                busRoute: student.busRoute ?? '',
                classId: student.class?.id ?? '',
              });
              setEditDialogOpen(true);
            }}
            className="cursor-pointer rounded border border-border px-md py-sm text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t.studentDetail.editProfile}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={t.common.comingSoon}
            className="cursor-not-allowed rounded border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
          >
            {t.studentDetail.editProfile}
          </button>
        )}
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
                  <dd className="font-medium text-foreground">
                    {student.gender === 'male'
                      ? t.studentDetail.genderMale
                      : student.gender === 'female'
                        ? t.studentDetail.genderFemale
                        : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.students.nationality}</dt>
                  <dd className="font-medium text-foreground">{student.nationality ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.students.busRoute}</dt>
                  <dd className="font-medium text-foreground">{student.busRoute ?? '—'}</dd>
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
              <button
                type="button"
                onClick={() => setTab('grades')}
                className="cursor-pointer rounded-lg border border-border bg-card p-lg text-start shadow-ambient transition-colors hover:bg-accent"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.studentDetail.gpaScore}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{studentAverage !== null ? `${studentAverage}%` : '—'}</div>
                <p className="text-xs text-muted-foreground">
                  {studentAverage !== null ? t.studentDetail.subjectBreakdown : t.studentDetail.gpaPlaceholder}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTab('attendance')}
                className="cursor-pointer rounded-lg border border-border bg-card p-lg text-start shadow-ambient transition-colors hover:bg-accent"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.studentDetail.attendance}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceRate !== null ? t.attendanceReport.title : t.studentDetail.attendancePlaceholder}
                </p>
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.studentDetail.activityTimeline}
              </h2>
              {activityEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.studentDetail.noActivityYet}</p>
              ) : (
                <ul className="space-y-md">
                  {activityEvents.map((ev) => {
                    const Icon = ACTIVITY_ICON[ev.type];
                    return (
                      <li key={ev.id} className="flex items-start gap-sm text-sm">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-foreground">{ev.label}</p>
                          <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString(dateLocale)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'grades' && (
        <div className="space-y-lg">
          {subjectBreakdown.length === 0 ? (
            <EmptyTab icon={TrendingUp} message={t.studentDetail.gradesEmpty} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.studentDetail.levelComparison}
                  </h2>
                  <p className="mb-md text-xs text-muted-foreground">{t.studentDetail.levelComparisonDesc}</p>
                  <div className="space-y-sm">
                    <div>
                      <div className="mb-1 flex justify-between text-sm text-foreground">
                        <span>{t.studentDetail.studentAverageLabel}</span>
                        <span className="font-semibold">{studentAverage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary/15">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, studentAverage ?? 0)}%` }} />
                      </div>
                    </div>
                    {classAverage !== null && (
                      <div>
                        <div className="mb-1 flex justify-between text-sm text-foreground">
                          <span>{t.studentDetail.classAverageLabel}</span>
                          <span className="font-semibold">{classAverage}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${Math.min(100, classAverage)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {studentAverage !== null && classAverage !== null && (
                    <p className="mt-md rounded-md bg-accent/40 p-sm text-xs text-foreground">
                      {interpolate(
                        studentAverage >= classAverage ? t.studentDetail.aboveClassAverage : t.studentDetail.belowClassAverage,
                        { points: Math.abs(studentAverage - classAverage) },
                      )}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.studentDetail.latestGrades}
                  </h2>
                  {latestGrades.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.studentDetail.noGradesYet}</p>
                  ) : (
                    <ul className="space-y-sm">
                      {latestGrades.map((g) => (
                        <li key={g.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            {g.classSubject.subject.name} — {t.grades[g.component === 'QUIZZES' ? 'quizzes' : g.component === 'MIDTERM' ? 'midterm' : g.component === 'FINAL' ? 'final' : 'participation']}
                          </span>
                          <span className="font-medium text-foreground">
                            {g.score}/{GRADE_MAX[g.component]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.studentDetail.upcomingTasks}
                  </h2>
                  {upcomingTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.studentDetail.noUpcomingTasks}</p>
                  ) : (
                    <ul className="space-y-sm">
                      {upcomingTasks.map((a) => (
                        <li key={a.id} className="text-sm">
                          <div className="font-medium text-foreground">{a.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.classSubject.subject.name} · {new Date(a.dueAt).toLocaleDateString(dateLocale)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <h2 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.studentDetail.subjectBreakdown}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.studentName}</th>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.quizzes}</th>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.midterm}</th>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.final}</th>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.participation}</th>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.total}</th>
                        <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.grades.statusLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectBreakdown.map((s) => {
                        const status =
                          s.total >= 90
                            ? { label: t.grades.statusExcellent, className: 'bg-success/10 text-success' }
                            : s.total >= 80
                              ? { label: t.grades.statusVeryGood, className: 'bg-primary/10 text-primary' }
                              : s.total >= 60
                                ? { label: t.grades.statusGood, className: 'bg-tertiary/10 text-tertiary' }
                                : { label: t.grades.statusNeedsImprovement, className: 'bg-destructive/10 text-destructive' };
                        return (
                          <tr key={s.classSubjectId} className="border-b border-border last:border-0">
                            <td className="whitespace-nowrap px-md py-sm font-medium text-foreground">{s.subjectName}</td>
                            {GRADE_COMPONENTS.map((c) => (
                              <td key={c} className="whitespace-nowrap px-md py-sm text-foreground">
                                {s.scores[c] ?? '—'}
                              </td>
                            ))}
                            <td className="whitespace-nowrap px-md py-sm font-semibold text-foreground">{s.total}</td>
                            <td className="whitespace-nowrap px-md py-sm">
                              <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-lg">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              dir="ltr"
            />
            <div className="flex gap-sm">
              <button
                type="button"
                disabled
                title={t.common.comingSoon}
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
              >
                <Download className="h-4 w-4" />
                {t.attendanceReport.downloadPdf}
              </button>
              <button
                type="button"
                disabled
                title={t.common.comingSoon}
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-md py-sm text-sm font-medium text-muted-foreground opacity-60"
              >
                <Printer className="h-4 w-4" />
                {t.attendanceReport.printReport}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md lg:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-primary">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.attendanceRate}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-tertiary">{lateDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.lateDays}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-destructive">{absentDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.absentDays}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-success">{presentDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.presentDays}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-lg text-center shadow-ambient">
              <div className="text-2xl font-bold text-foreground">{schoolDays}</div>
              <div className="text-xs text-muted-foreground">{t.attendanceReport.schoolDays}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
            <div className="space-y-lg lg:col-span-1">
              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <h3 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.attendanceReport.legendTitle}
                </h3>
                <ul className="space-y-sm text-sm">
                  {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatusValue[]).map((s) => (
                    <li key={s} className="flex items-start gap-sm">
                      <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${STATUS_DOT[s]}`} />
                      <div>
                        <div className="font-medium text-foreground">{t.attendanceStatus[s]}</div>
                        <div className="text-xs text-muted-foreground">
                          {s === 'PRESENT' && t.attendanceReport.legendPresentDesc}
                          {s === 'ABSENT' && t.attendanceReport.legendAbsentDesc}
                          {s === 'LATE' && t.attendanceReport.legendLateDesc}
                          {s === 'EXCUSED' && t.attendanceReport.legendExcusedDesc}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                <h3 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.attendanceReport.supervisorNotes}
                </h3>
                {canWrite && (
                  <div className="mb-md flex gap-sm">
                    <input
                      type="text"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder={t.attendanceReport.addNotePlaceholder}
                      className="flex-1 rounded-md border border-input bg-background px-sm py-1.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <button
                      type="button"
                      disabled={!noteBody.trim() || addNoteMutation.isPending}
                      onClick={() => addNoteMutation.mutate(noteBody.trim())}
                      className="cursor-pointer rounded-md bg-primary px-md py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t.attendanceReport.postNote}
                    </button>
                  </div>
                )}
                {addNoteMutation.isError && (
                  <p className="mb-sm text-sm text-destructive">
                    {addNoteMutation.error instanceof ApiError ? addNoteMutation.error.message : 'Something went wrong'}
                  </p>
                )}
                {!notesQuery.data || notesQuery.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.attendanceReport.noNotesYet}</p>
                ) : (
                  <ul className="space-y-sm">
                    {notesQuery.data.slice(0, 3).map((n) => (
                      <li key={n.id} className="flex items-start gap-sm">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(n.authorUser?.email ?? '?')}
                        </span>
                        <div>
                          <p className="text-sm text-foreground">{n.body}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.authorUser?.email} · {new Date(n.createdAt).toLocaleDateString(dateLocale)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <MonthCalendar month={reportMonth} records={records} dayLabels={t.timetable.shortDays} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
            <h3 className="mb-md text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t.attendanceReport.detailedLog}
            </h3>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.attendanceReport.noRecordsYet}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceReport.logDate}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceReport.logDay}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.status}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceReport.logArrival}</th>
                      <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.attendanceRegister.notes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...records]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                            {r.date.slice(0, 10)}
                          </td>
                          <td className="whitespace-nowrap px-md py-sm text-foreground">
                            {t.timetable.days[new Date(r.date).getUTCDay()]}
                          </td>
                          <td className="whitespace-nowrap px-md py-sm">
                            <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${STATUS_DOT[r.status]}`}>
                              {t.attendanceStatus[r.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                            {r.arrivalTime ?? '—'}
                          </td>
                          <td className="px-md py-sm text-foreground">{r.note ?? '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">{t.attendanceReport.generatedFooter}</p>
        </div>
      )}

      {tab === 'exams' && (
        <div className="space-y-lg">
          {!canViewExams || (examsQuery.data ?? []).length === 0 ? (
            <EmptyTab icon={FileQuestion} message={t.studentDetail.examsEmpty} />
          ) : (
            <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
              <ul className="divide-y divide-border">
                {(examsQuery.data ?? []).map((exam) => (
                  <li key={exam.id} className="flex items-center gap-sm py-sm first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileQuestion className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {exam.subject.name} — {exam.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {exam.examType} · {new Date(exam.examDate).toLocaleDateString(dateLocale)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'fees' && (
        <div className="space-y-lg">
          {!canViewFees ? (
            <EmptyTab icon={ReceiptText} message={t.studentDetail.feesEmpty} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-md">
                <div className="grid grid-cols-2 gap-md">
                  <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                    <div className="text-xs text-muted-foreground">{t.studentDetail.feesTotalDue}</div>
                    <div className="text-2xl font-bold text-foreground" dir="ltr">
                      {totalDue.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                    <div className="text-xs text-muted-foreground">{t.studentDetail.feesTotalPaid}</div>
                    <div className="text-2xl font-bold text-success" dir="ltr">
                      {totalPaid.toFixed(2)}
                    </div>
                  </div>
                </div>
                {canManageFees && (
                  <button
                    type="button"
                    onClick={() => {
                      resetFeeForm({ title: '', amountDue: undefined, dueDate: '' });
                      setFeeDialogOpen(true);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    {t.studentDetail.feesAddInvoice}
                  </button>
                )}
              </div>

              {feeInvoices.length === 0 ? (
                <EmptyTab icon={ReceiptText} message={t.studentDetail.feesEmpty} />
              ) : (
                <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                      <thead className="border-b border-border text-muted-foreground">
                        <tr>
                          <th className="whitespace-nowrap px-md py-sm text-start font-medium">
                            {t.studentDetail.feesInvoiceTitleLabel}
                          </th>
                          <th className="whitespace-nowrap px-md py-sm text-start font-medium">
                            {t.studentDetail.feesAmountLabel}
                          </th>
                          <th className="whitespace-nowrap px-md py-sm text-start font-medium">
                            {t.studentDetail.feesDueDateLabel}
                          </th>
                          <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.users.status}</th>
                          <th className="whitespace-nowrap px-md py-sm text-start font-medium">{t.common.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeInvoices.map((f) => (
                          <tr key={f.id} className="border-b border-border last:border-0">
                            <td className="whitespace-nowrap px-md py-sm font-medium text-foreground">{f.title}</td>
                            <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                              {parseFloat(f.amountDue).toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-md py-sm text-foreground" dir="ltr">
                              {new Date(f.dueDate).toLocaleDateString(dateLocale)}
                            </td>
                            <td className="whitespace-nowrap px-md py-sm">
                              <span className={`rounded-full px-sm py-0.5 text-xs font-medium ${FEE_STATUS_BADGE[f.status]}`}>
                                {FEE_STATUS_LABEL[f.status]}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-md py-sm">
                              {(canManageFees || canRecordPayment) && f.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    resetPaymentForm({ amount: undefined, method: 'CASH', referenceNumber: '' });
                                    setPayInvoiceId(f.id);
                                  }}
                                  className="cursor-pointer rounded border border-border px-sm py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                                >
                                  {t.studentDetail.feesRecordPayment}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-lg">
          {!canViewDocuments ? (
            <EmptyTab icon={FileText} message={t.studentDetail.documentsEmpty} />
          ) : (
            <>
              {canManageDocuments && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDocFile(null);
                      resetDocForm({ title: '' });
                      setDocDialogOpen(true);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    {t.studentDetail.documentsUploadTitle}
                  </button>
                </div>
              )}

              {!documentsQuery.data || documentsQuery.data.length === 0 ? (
                <EmptyTab icon={FileText} message={t.studentDetail.documentsEmpty} />
              ) : (
                <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
                  <ul className="divide-y divide-border">
                    {documentsQuery.data.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-md py-sm first:pt-0 last:pb-0">
                        <div className="flex items-center gap-sm">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-sm font-medium text-foreground">{d.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {interpolate(t.studentDetail.documentsUploadedBy, { name: d.uploadedByUser?.email ?? '—' })} ·{' '}
                              {new Date(d.createdAt).toLocaleDateString(dateLocale)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => downloadAuthenticated(`/documents/${d.id}/download`, d.fileName)}
                            className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-label={t.common.download}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {canManageDocuments && (
                            <button
                              type="button"
                              onClick={() =>
                                confirm(interpolate(t.studentDetail.documentsDeleteConfirm, { title: d.title })) &&
                                deleteDocMutation.mutate(d.id)
                              }
                              className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={t.common.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title={t.studentDetail.editProfileTitle}
      >
        <form
          onSubmit={handleEditSubmit((data) => {
            updateProfileMutation.mutate(data);
          })}
        >
          <FormField label={t.studentDetail.dob} htmlFor="editDob" error={editErrors.dateOfBirth?.message}>
            <input id="editDob" type="date" className={inputClass} dir="ltr" {...registerEdit('dateOfBirth')} />
          </FormField>
          <FormField label={t.studentDetail.gender} htmlFor="editGender">
            <select id="editGender" className={inputClass} {...registerEdit('gender')}>
              <option value="">{t.studentDetail.selectGender}</option>
              <option value="male">{t.studentDetail.genderMale}</option>
              <option value="female">{t.studentDetail.genderFemale}</option>
            </select>
          </FormField>
          <FormField label={t.students.nationality} htmlFor="editNationality">
            <input id="editNationality" className={inputClass} {...registerEdit('nationality')} />
          </FormField>
          <FormField label={t.students.busRoute} htmlFor="editBusRoute">
            <input id="editBusRoute" className={inputClass} {...registerEdit('busRoute')} />
          </FormField>
          <FormField label={t.students.class} htmlFor="editClassId">
            <select id="editClassId" className={inputClass} {...registerEdit('classId')}>
              <option value="">{t.students.unassigned}</option>
              {classesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          {updateProfileMutation.isError && (
            <p className="mb-md text-sm text-destructive">
              {updateProfileMutation.error instanceof ApiError ? updateProfileMutation.error.message : 'Something went wrong'}
            </p>
          )}
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="w-full cursor-pointer rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {updateProfileMutation.isPending ? t.common.creating : t.common.save}
          </button>
        </form>
      </Dialog>

      <Dialog open={feeDialogOpen} onClose={() => setFeeDialogOpen(false)} title={t.studentDetail.feesAddInvoice}>
        <form
          onSubmit={handleFeeSubmit((data) => {
            createInvoiceMutation.mutate(data);
          })}
        >
          <FormField label={t.studentDetail.feesInvoiceTitleLabel} htmlFor="feeTitle" error={feeErrors.title?.message}>
            <input id="feeTitle" className={inputClass} {...registerFee('title')} />
          </FormField>
          <FormField label={t.studentDetail.feesAmountLabel} htmlFor="feeAmount" error={feeErrors.amountDue?.message}>
            <input id="feeAmount" type="number" step="0.01" className={inputClass} dir="ltr" {...registerFee('amountDue')} />
          </FormField>
          <FormField label={t.studentDetail.feesDueDateLabel} htmlFor="feeDueDate" error={feeErrors.dueDate?.message}>
            <input id="feeDueDate" type="date" className={inputClass} dir="ltr" {...registerFee('dueDate')} />
          </FormField>
          {createInvoiceMutation.isError && (
            <p className="mb-md text-sm text-destructive">
              {createInvoiceMutation.error instanceof ApiError ? createInvoiceMutation.error.message : 'Something went wrong'}
            </p>
          )}
          <button
            type="submit"
            disabled={createInvoiceMutation.isPending}
            className="w-full cursor-pointer rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {createInvoiceMutation.isPending ? t.common.creating : t.common.create}
          </button>
        </form>
      </Dialog>

      <Dialog open={!!payInvoiceId} onClose={() => setPayInvoiceId(null)} title={t.studentDetail.feesRecordPayment}>
        {payingInvoice && (
          <>
            <div className="mb-md rounded-md bg-muted p-sm">
              <div className="text-sm font-medium text-foreground">{payingInvoice.title}</div>
              <div className="text-xs text-muted-foreground">{t.studentDetail.feesPaymentHistory}</div>
              {payingInvoice.payments.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">{t.studentDetail.feesNoPaymentsYet}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {payingInvoice.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-xs text-foreground">
                      <span>
                        {PAYMENT_METHOD_LABEL[p.method]} · {new Date(p.paidAt).toLocaleDateString(dateLocale)}
                      </span>
                      <span dir="ltr">{parseFloat(p.amount).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form
              onSubmit={handlePaymentSubmit((data) => {
                addPaymentMutation.mutate({ invoiceId: payingInvoice.id, data });
              })}
            >
              <FormField
                label={t.finance.paymentAmountLabel}
                htmlFor="paymentAmount"
                error={paymentErrors.amount?.message}
              >
                <input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  dir="ltr"
                  {...registerPayment('amount')}
                />
              </FormField>
              <FormField label={t.finance.paymentMethodLabel} htmlFor="paymentMethod">
                <select id="paymentMethod" className={inputClass} {...registerPayment('method')}>
                  <option value="CASH">{t.finance.methodCash}</option>
                  <option value="BANK_TRANSFER">{t.finance.methodBankTransfer}</option>
                  <option value="CARD">{t.finance.methodCard}</option>
                  <option value="OTHER">{t.finance.methodOther}</option>
                </select>
              </FormField>
              <FormField label={t.finance.referenceNumberLabel} htmlFor="paymentReference">
                <input id="paymentReference" className={inputClass} {...registerPayment('referenceNumber')} />
              </FormField>
              {addPaymentMutation.isError && (
                <p className="mb-md text-sm text-destructive">
                  {addPaymentMutation.error instanceof ApiError ? addPaymentMutation.error.message : 'Something went wrong'}
                </p>
              )}
              <button
                type="submit"
                disabled={addPaymentMutation.isPending}
                className="w-full cursor-pointer rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {addPaymentMutation.isPending ? t.common.creating : t.finance.recordPayment}
              </button>
            </form>
          </>
        )}
      </Dialog>

      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)} title={t.studentDetail.documentsUploadTitle}>
        <form
          onSubmit={handleDocSubmit((data) => {
            if (docFile) uploadDocMutation.mutate({ title: data.title, file: docFile });
          })}
        >
          <FormField label={t.studentDetail.documentsTitleLabel} htmlFor="docTitle" error={docErrors.title?.message}>
            <input id="docTitle" className={inputClass} {...registerDoc('title')} />
          </FormField>
          <FormField label={t.studentDetail.documentsFileLabel} htmlFor="docFile">
            <input
              id="docFile"
              type="file"
              className={inputClass}
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            />
          </FormField>
          {uploadDocMutation.isError && (
            <p className="mb-md text-sm text-destructive">
              {uploadDocMutation.error instanceof ApiError ? uploadDocMutation.error.message : 'Something went wrong'}
            </p>
          )}
          <button
            type="submit"
            disabled={uploadDocMutation.isPending || !docFile}
            className="w-full cursor-pointer rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {uploadDocMutation.isPending ? t.common.uploading : t.common.upload}
          </button>
        </form>
      </Dialog>
    </div>
  );
}

function MonthCalendar({
  month,
  records,
  dayLabels,
}: {
  month: string;
  records: AttendanceRecord[];
  dayLabels: string[];
}) {
  const { year, monthIndex } = monthRange(month);
  const byDate = new Map(records.map((r) => [r.date.slice(0, 10), r]));
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();

  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-lg border border-border bg-card p-lg shadow-ambient">
      <div className="mb-sm grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {dayLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = byDate.get(dateStr);
          return (
            <div
              key={dateStr}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-xs ${
                record ? STATUS_DOT[record.status] : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="font-medium">{day}</span>
            </div>
          );
        })}
      </div>
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
