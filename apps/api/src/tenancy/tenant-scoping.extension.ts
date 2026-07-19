import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenancyContext } from './tenancy-context';

/**
 * Auto-injects schoolId into every query/write for tenant-scoped models.
 * Fails closed: throws if called with no tenant context, rather than silently
 * running an unscoped query. This is layer 2 of tenant isolation (see ARCHITECTURE.md §2);
 * layer 3 (Postgres RLS) still applies underneath even if this layer is ever bypassed.
 */
function scopeOperation(model: string) {
  return async ({ args, operation, query }: { args: any; operation: string; query: (args: any) => Promise<unknown> }) => {
    const store = TenancyContext.get();
    if (!store) {
      throw new ForbiddenException(`Tenant context is required to access ${model}.${operation}`);
    }

    if (operation === 'create') {
      args.data = { ...args.data, schoolId: store.schoolId };
    } else if (operation === 'createMany') {
      const rows = Array.isArray(args.data) ? args.data : [args.data];
      args.data = rows.map((row: Record<string, unknown>) => ({ ...row, schoolId: store.schoolId }));
    } else if (operation === 'upsert') {
      // upsert has both a lookup (`where`) and a nested insert payload (`create`) —
      // both need scoping, or an upsert that falls through to insert would create
      // a cross-tenant-invisible row with no schoolId.
      args.where = { ...(args.where ?? {}), schoolId: store.schoolId };
      args.create = { ...(args.create ?? {}), schoolId: store.schoolId };
    } else {
      args.where = { ...(args.where ?? {}), schoolId: store.schoolId };
    }

    return query(args);
  };
}

const TENANT_SCOPED_MODELS = [
  'user',
  'role',
  'refreshToken',
  'academicYear',
  'gradeLevel',
  'class',
  'subject',
  'classSubject',
  'teacher',
  'student',
  'parent',
  'studentGuardian',
  'timetableSlot',
  'studentAttendance',
  'teacherAttendance',
  'teacherLeaveRequest',
  'studentAttendanceNote',
  'studentGrade',
  'assignment',
  'assignmentSubmission',
  'question',
  'exam',
  'examQuestion',
  'notification',
  'notificationRecipient',
] as const;

export const tenantScopingExtension = Prisma.defineExtension({
  name: 'tenant-scoping',
  query: Object.fromEntries(
    TENANT_SCOPED_MODELS.map((model) => [model, { $allOperations: scopeOperation(model) }]),
  ) as Record<(typeof TENANT_SCOPED_MODELS)[number], { $allOperations: ReturnType<typeof scopeOperation> }>,
});
