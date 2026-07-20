import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { AttendanceReportQueryDto, AcademicReportQueryDto, FinancialReportQueryDto } from './dto/report-query.dto';

const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const;
const INVOICE_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async attendance(query: AttendanceReportQueryDto) {
    const records = await this.prisma.client.studentAttendance.findMany({
      where: {
        classId: query.classId,
        date:
          query.from || query.to
            ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined }
            : undefined,
      },
      include: {
        student: { include: { user: { select: SAFE_USER_FIELDS } } },
        class: true,
      },
      orderBy: { date: 'desc' },
    });

    const byStatus = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s, 0])) as Record<
      (typeof ATTENDANCE_STATUSES)[number],
      number
    >;
    type AttendanceStatusKey = (typeof ATTENDANCE_STATUSES)[number];
    type AttendanceRecord = (typeof records)[number];
    for (const r of records as AttendanceRecord[]) byStatus[r.status as AttendanceStatusKey]++;
    const total = records.length;
    const attendanceRate = total > 0 ? Math.round(((byStatus.PRESENT + byStatus.LATE) / total) * 1000) / 10 : null;

    const byClass = new Map<string, { className: string; total: number; present: number }>();
    for (const r of records as AttendanceRecord[]) {
      const key = r.classId;
      const entry = byClass.get(key) ?? { className: r.class.name, total: 0, present: 0 };
      entry.total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') entry.present++;
      byClass.set(key, entry);
    }
    const classBreakdown = Array.from(byClass.values()).map((c) => ({
      className: c.className,
      total: c.total,
      rate: Math.round((c.present / c.total) * 1000) / 10,
    }));

    return {
      summary: { total, attendanceRate, byStatus },
      classBreakdown,
      rows: records.map((r: AttendanceRecord) => ({
        date: r.date,
        className: r.class.name,
        admissionNumber: r.student.admissionNumber,
        studentEmail: r.student.user.email,
        status: r.status,
      })),
    };
  }

  async academic(query: AcademicReportQueryDto) {
    const grades = await this.prisma.client.studentGrade.findMany({
      where: {
        term: query.term,
        classSubject: query.classId ? { classId: query.classId } : undefined,
      },
      include: {
        student: { include: { user: { select: SAFE_USER_FIELDS } } },
        classSubject: { include: { subject: true, class: true } },
      },
    });

    // Group into per-(student, classSubject, term) totals out of 100, matching
    // the formula used on the student profile page (sum of 4 component scores).
    const subjectTotals = new Map<
      string,
      { studentId: string; studentEmail: string | null; classSubjectId: string; className: string; subjectName: string; term: string; total: number }
    >();
    for (const g of grades) {
      const key = `${g.studentId}:${g.classSubjectId}:${g.term}`;
      const entry = subjectTotals.get(key) ?? {
        studentId: g.studentId,
        studentEmail: g.student.user.email,
        classSubjectId: g.classSubjectId,
        className: g.classSubject.class.name,
        subjectName: g.classSubject.subject.name,
        term: g.term,
        total: 0,
      };
      entry.total += g.score;
      subjectTotals.set(key, entry);
    }
    const subjectRows = Array.from(subjectTotals.values());

    const studentAverages = new Map<string, { total: number; count: number }>();
    for (const row of subjectRows) {
      const entry = studentAverages.get(row.studentId) ?? { total: 0, count: 0 };
      entry.total += row.total;
      entry.count++;
      studentAverages.set(row.studentId, entry);
    }
    const averages = Array.from(studentAverages.values()).map((s) => s.total / s.count);
    const schoolAverage = averages.length > 0 ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10 : null;

    const bySubject = new Map<string, { subjectName: string; total: number; count: number }>();
    for (const row of subjectRows) {
      const entry = bySubject.get(row.subjectName) ?? { subjectName: row.subjectName, total: 0, count: 0 };
      entry.total += row.total;
      entry.count++;
      bySubject.set(row.subjectName, entry);
    }
    const subjectBreakdown = Array.from(bySubject.values()).map((s) => ({
      subjectName: s.subjectName,
      average: Math.round((s.total / s.count) * 10) / 10,
    }));

    return {
      summary: { studentCount: studentAverages.size, schoolAverage },
      subjectBreakdown,
      rows: subjectRows.map((r) => ({
        studentEmail: r.studentEmail,
        className: r.className,
        subjectName: r.subjectName,
        term: r.term,
        total: r.total,
      })),
    };
  }

  async financial(query: FinancialReportQueryDto) {
    const invoices = await this.prisma.client.invoice.findMany({
      where: {
        dueDate:
          query.from || query.to
            ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined }
            : undefined,
      },
      include: {
        student: { include: { user: { select: SAFE_USER_FIELDS } } },
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
    });

    const byStatus = Object.fromEntries(INVOICE_STATUSES.map((s) => [s, { count: 0, amountDue: 0 }])) as Record<
      (typeof INVOICE_STATUSES)[number],
      { count: number; amountDue: number }
    >;
    type InvoiceStatusKey = (typeof INVOICE_STATUSES)[number];
    type InvoiceRow = (typeof invoices)[number];
    type PaymentRow = InvoiceRow['payments'][number];
    let totalInvoiced = 0;
    let totalCollected = 0;
    for (const inv of invoices as InvoiceRow[]) {
      const amountDue = Number(inv.amountDue);
      const paid = inv.payments.reduce((sum: number, p: PaymentRow) => sum + Number(p.amount), 0);
      totalInvoiced += amountDue;
      totalCollected += paid;
      const statusKey = inv.status as InvoiceStatusKey;
      byStatus[statusKey].count++;
      byStatus[statusKey].amountDue += amountDue;
    }

    return {
      summary: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstanding: Math.round((totalInvoiced - totalCollected) * 100) / 100,
        byStatus,
      },
      rows: invoices.map((inv: InvoiceRow) => ({
        studentEmail: inv.student.user.email,
        title: inv.title,
        amountDue: Number(inv.amountDue),
        paid: inv.payments.reduce((sum: number, p: PaymentRow) => sum + Number(p.amount), 0),
        dueDate: inv.dueDate,
        status: inv.status,
      })),
    };
  }
}
