import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';
import { AttendanceReportQueryDto, AcademicReportQueryDto, FinancialReportQueryDto } from './dto/report-query.dto';
import { toCsv } from './csv.util';

function sendCsv(res: Response, filename: string, columns: string[], rows: unknown[][]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(columns, rows));
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('attendance')
  @RequirePermission('attendance:read')
  attendance(@Query() query: AttendanceReportQueryDto) {
    return this.service.attendance(query);
  }

  @Get('attendance/export')
  @RequirePermission('attendance:read')
  async attendanceExport(@Query() query: AttendanceReportQueryDto, @Res() res: Response) {
    const report = await this.service.attendance(query);
    sendCsv(
      res,
      'attendance-report.csv',
      ['Date', 'Class', 'Admission Number', 'Student Email', 'Status'],
      report.rows.map((r: (typeof report.rows)[number]) => [
        r.date.toISOString().slice(0, 10),
        r.className,
        r.admissionNumber,
        r.studentEmail,
        r.status,
      ]),
    );
  }

  @Get('academic')
  @RequirePermission('grades:read')
  academic(@Query() query: AcademicReportQueryDto) {
    return this.service.academic(query);
  }

  @Get('academic/export')
  @RequirePermission('grades:read')
  async academicExport(@Query() query: AcademicReportQueryDto, @Res() res: Response) {
    const report = await this.service.academic(query);
    sendCsv(
      res,
      'academic-report.csv',
      ['Student Email', 'Class', 'Subject', 'Term', 'Total (/100)'],
      report.rows.map((r) => [r.studentEmail, r.className, r.subjectName, r.term, r.total]),
    );
  }

  @Get('financial')
  @RequirePermission('finance:read')
  financial(@Query() query: FinancialReportQueryDto) {
    return this.service.financial(query);
  }

  @Get('financial/export')
  @RequirePermission('finance:read')
  async financialExport(@Query() query: FinancialReportQueryDto, @Res() res: Response) {
    const report = await this.service.financial(query);
    sendCsv(
      res,
      'financial-report.csv',
      ['Student Email', 'Invoice Title', 'Amount Due', 'Paid', 'Due Date', 'Status'],
      report.rows.map((r: (typeof report.rows)[number]) => [
        r.studentEmail,
        r.title,
        r.amountDue,
        r.paid,
        r.dueDate.toISOString().slice(0, 10),
        r.status,
      ]),
    );
  }
}
