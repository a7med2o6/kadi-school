# Kadi School — Software Architecture Document

Multi-tenant School Management SaaS. Status: pre-implementation, planning only.

---

## 1. Guiding Principles & Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Tenancy model | **Shared database, shared schema, `school_id` on every tenant-scoped row** (row-level multi-tenancy) | Starting with 1 school but must scale to many. Schema-per-tenant or DB-per-tenant is operationally expensive (migrations × N) and unnecessary until you have compliance reasons to isolate data physically. Row-level isolation with Postgres **Row-Level Security (RLS)** policies keyed on `school_id` gives near-equivalent isolation guarantees at a fraction of the ops cost, and scales to thousands of tenants before you'd ever need to shard. |
| Tenant resolution | Subdomain (`{school-slug}.kadischool.app`) resolved in NestJS middleware → injected as `TenantContext` (AsyncLocalStorage) → every Prisma query auto-scoped | Avoids "forgot to filter by school_id" as a class of bug — enforced once at the data-access layer instead of trusted to every query author. |
| Super Admin | Lives **outside** tenant scope, own auth realm, manages tenants/billing/impersonation | Super Admin must never be scoped by RLS; it's a platform-level role, not a school-level one. Kept as a separate Nest module/guard so tenant RLS bypass is explicit and auditable, not accidental. |
| Architecture style | **Modular Monolith** (NestJS modules, one deployable) for v1, with clean module boundaries that allow extraction to microservices later (e.g., Notifications, Reports) if load demands it | A 10-person school's data volume does not justify microservices operational overhead on day one. Modular monolith gets you 90% of the maintainability benefit (DDD bounded contexts, independent module folders, enforced import boundaries) with 10% of the deployment complexity. Revisit only when a specific module's scaling/deploy cadence genuinely diverges. |
| Domain modeling | **DDD-lite**: each module = one bounded context with its own Prisma models, service layer, DTOs; cross-module communication via injected services or a lightweight internal event bus (Nest `EventEmitter2`), never direct cross-module repository access | Keeps modules independently testable/replaceable per the "modular by feature" requirement, without full CQRS/event-sourcing ceremony this project doesn't need yet. |
| Auth | JWT (short-lived access, ~15 min) + rotating refresh token (httpOnly cookie, ~30 days) + RBAC via Nest Guards/Decorators + **Attribute-based scoping** (e.g., teacher can only grade their own assigned classes) | RBAC alone answers "can a Teacher grade exams" (yes) but not "can *this* teacher grade *this* class" — that requires resource-level ownership checks layered on top of role checks. Document this explicitly so it isn't missed during implementation. |
| Student/Parent identity | Civil ID as **login identifier**, not primary key | Civil ID can be corrected/reissued; using it as PK would cascade into every FK. Store as a unique, indexed column on `users`, separate from the UUID PK. |
| API style | REST (per requirements) with versioning (`/api/v1/...`), OpenAPI/Swagger auto-generated from Nest decorators | Team explicitly requested REST over GraphQL; Swagger keeps the "document every endpoint" requirement low-maintenance. |
| File storage | Cloudflare R2 via S3-compatible SDK, presigned URLs for upload/download, no file bytes touch the API server | Avoids loading the Nest process with multipart uploads; keeps storage vendor swappable (R2 today, S3 tomorrow) since the SDK contract is identical. |

---

## 2. Multi-Tenancy Deep Dive

**Tenant-scoped tables** (contain `school_id`): users (except Super Admin), students, teachers, parents, classes, subjects, timetables, attendance_*, exams, grades, homework, notifications, finance_*, payroll_*, files, settings, roles/permissions overrides.

**Global tables** (no `school_id`): `schools` (the tenant registry itself), `super_admins`, `subscription_plans`, `audit_logs` (partitioned by school_id but queryable platform-wide), `system_settings`.

**Enforcement layers (defense in depth):**
1. **Middleware**: resolves `school_id` from subdomain/JWT claim → stores in `AsyncLocalStorage`.
2. **Prisma Client Extension**: intercepts every query on tenant-scoped models, auto-injects `WHERE school_id = :current` on reads and `school_id` on writes. Throws if no tenant context is present for a tenant-scoped model — fails closed, not open.
3. **Postgres RLS policies**: `USING (school_id = current_setting('app.current_school_id')::uuid)` on every tenant table, set via `SET LOCAL` per request/transaction. This is the last line of defense if the Prisma layer is ever bypassed (raw SQL, a migration script, a bug).
4. **JWT claim**: `school_id` embedded in the access token at login; a request whose token `school_id` doesn't match the resolved subdomain is rejected (prevents cross-tenant token replay).

**Onboarding a new school** = insert into `schools`, provision default `roles`/`permissions` rows scoped to that `school_id`, create the first School Admin user. No schema migration, no new database — this is the whole point of the row-level model.

---

## 3. Modules

Each module below is an independent NestJS module (`apps/api/src/modules/<name>`) and an independent frontend feature folder (`apps/web/src/features/<name>`). Modules depend on shared `core`/`common` libs only, never on each other's internals.

| Module | Responsibility |
|---|---|
| **iam** (auth + rbac) | Login, refresh, logout, password reset, roles, permissions, session/device tracking |
| **tenancy** | School registry, subdomain resolution, tenant settings, subscription/plan limits |
| **dashboard** | Aggregated stats/widgets per role (composes read-models from other modules, owns nothing) |
| **students** | Student profiles, enrollment, guardians linkage, documents |
| **teachers** | Teacher profiles, subject/class assignments, qualifications, employment data |
| **parents** | Parent/guardian profiles, student linkage, communication preferences |
| **classes** | Grade levels, sections/classes, class-teacher assignment, capacity |
| **subjects** | Subject catalog, curriculum mapping, subject-class-teacher assignment |
| **timetable** | Periods, weekly schedule generation, room/teacher conflict checks |
| **attendance** | Teacher clock-in/out + derived work hours, student daily attendance, late/excused rules |
| **exams** | Exam definitions, scheduling, exam-subject-class mapping |
| **grades** | Gradebook entries, grading scales, report card computation |
| **homework** | Assignment creation, submission tracking, due dates, file attachments |
| **notifications** | In-app + email + push notification dispatch, templates, read-state |
| **finance** | Fee structures, invoices, payments, receipts (school → parent billing) |
| **payroll** | Staff salary structures, payslips, deductions (school → staff payroll) |
| **reports** | Cross-module report generation (attendance, academic, financial), export (PDF/Excel) |
| **files** | R2 presigned URL issuance, file metadata, access-control checks |
| **settings** | Per-school configuration: academic year, grading scale, branding, locale/RTL default |
| **audit** | Immutable log of sensitive actions (grade changes, payments, permission changes) |

---

## 4. User Roles & Permission Model

RBAC with a **Role → Permission** many-to-many, plus row-level ownership checks for teacher/student/parent scoping. Permissions follow `<module>:<action>` naming (e.g., `grades:write`, `finance:read`).

| Role | Scope | Representative Permissions |
|---|---|---|
| **Super Admin** | Platform-wide, cross-tenant | Manage schools, subscriptions, impersonate School Admin, view platform analytics. No access to a school's academic/financial *data* by default (impersonation is logged). |
| **School Admin** | Full tenant scope | Full CRUD on all modules within their school; manage roles/permissions for their staff; billing for their school. |
| **Principal** | Full read, scoped write | Read everything school-wide; approve exams/results/curriculum changes; cannot manage payroll/finance configuration. |
| **Vice Principal** | Same as Principal, narrower approval rights | Delegated subset of Principal's approvals (e.g., discipline, timetable) — configurable per school. |
| **Teacher** | Own assigned classes/subjects only | `attendance:write` (own classes), `grades:write` (own subject-classes), `homework:write` (own classes), `timetable:read` (own schedule). Attendance/grades writes are rejected server-side if the class isn't in the teacher's assignment list. |
| **Student** | Own record only | `timetable:read`, `grades:read`, `homework:read`, `exams:read`, `attendance:read` (own), `notifications:read`. No write access anywhere except homework submission. |
| **Parent** | Own linked children only | Same read set as Student, scoped to each linked child; `finance:read` (own invoices), `payments:create` (own invoices). |
| **HR** | Staff records | `teachers:write`, `payroll:write` (structures, not disbursement approval), staff attendance read. |
| **Accountant** | Financial data | `finance:write` (full), `payroll:read`, `reports:read` (financial reports only). |
| **Reception** | Front-desk operations | `students:write` (basic profile/enrollment), `parents:write`, visitor log, `notifications:write` (announcements), no grades/finance access. |

Permissions are seeded as defaults per role but stored as data (`role_permissions` table), so a School Admin can customize them per school without a code change — satisfies "clearly separated permissions" while staying configurable.

---

## 5. Attendance System Design

**Teacher attendance (auto-recorded):**
- On successful login (first login of the calendar day), the system writes a `teacher_attendance` row with `check_in_at = now()`.
- Logout (explicit logout action, or JWT refresh-token expiry treated as implicit end-of-session after a grace period) writes `check_out_at`.
- `working_hours` is a **generated/computed column** (`check_out_at - check_in_at`), not stored redundantly, to avoid drift.
- `is_late` computed against the school's configured `work_start_time` (in `school_settings`); stored as a boolean + `late_by_minutes` for reporting.
- Multiple login/logout cycles in a day are stored as multiple session rows; daily summary is a view aggregating them.

**Student attendance (teacher-recorded):**
- Recorded per class-period or per day (configurable per school — some schools take attendance every period, others once daily) by the assigned teacher.
- Status enum: `present | absent | late | excused`.
- `excused` requires a linked `attendance_excuse` record (reason, optional supporting document via `files` module, approved_by).
- Late arrival stores `arrived_at` for reporting on patterns.
- Immutable after end-of-day cutoff (configurable) unless amended by Admin/Principal with an audit-logged reason — prevents silent retroactive edits to attendance records that feed into reports.

---

## 6. Portals & Navigation

### Student Portal
`Dashboard → Timetable → Grades → Homework → Exams → Attendance → Notifications → Announcements → Profile`

### Teacher Portal
`Dashboard → My Classes → Attendance (take/view) → Grades (enter/view) → Homework (create/track) → Exams (create/view) → Timetable → Notifications → Profile`

### Admin/Principal/HR/Accountant/Reception Portal (single shell, role-filtered sidebar)
`Dashboard → Students → Teachers → Parents → Classes → Subjects → Timetable → Attendance → Exams → Grades → Homework → Finance → Payroll → Reports → Notifications → Settings`

Sidebar items are rendered from the resolved permission set at login — a role that lacks `finance:read` never sees Finance in the DOM, not just hidden via CSS (defense against client-side permission tampering; server still re-checks on every request).

---

## 7. Database Design

### 7.1 ERD Overview (textual)

```
schools 1───* users *───1 roles *───* permissions
users 1───1 students / teachers / parents (profile extension tables)
students *───* parents (student_guardians)
students *───1 classes *───1 grade_levels
classes *───* subjects (class_subjects, with teacher_id)
teachers *───* subjects (teacher_subjects)
classes 1───* timetable_slots *───1 subjects, *───1 teachers
students 1───* student_attendance *───1 classes, *───1 recorded_by(teacher)
teachers 1───* teacher_attendance
classes/subjects 1───* exams 1───* exam_results *───1 students
classes/subjects 1───* homework 1───* homework_submissions *───1 students
students 1───* invoices 1───* payments
teachers 1───1 payroll_structure 1───* payslips
users 1───* notifications (via notification_recipients)
all-tenant-tables *───1 schools
```

### 7.2 Core Tables

**`schools`** — the tenant registry; root of all multi-tenancy. `id, name, slug (unique), subdomain (unique), logo_url, timezone, locale_default, subscription_plan_id, status, created_at`.

**`users`** — single auth identity table for every human in the system (except super_admins), regardless of role. Keeps auth logic (password, MFA, refresh tokens) in one place instead of duplicated per role table. `id (uuid), school_id (FK, indexed), email (nullable — students may not have one), civil_id (unique per school, indexed), password_hash, phone, status (active/suspended), locale, last_login_at, created_at, updated_at`. Index: `(school_id, civil_id)` unique composite, `(school_id, email)` unique composite.

**`roles`** — `id, school_id (nullable — null = system default role), name, is_system_default`. Nullable school_id lets you ship default roles once and let schools clone/customize.

**`permissions`** — `id, key (e.g. grades:write), module, description`. Global, not tenant-scoped.

**`role_permissions`** — join table `role_id, permission_id`.

**`user_roles`** — join table `user_id, role_id` (supports a user holding multiple roles, e.g., Teacher + Parent).

**`students`** — profile extension of `users`. `id, user_id (FK unique), school_id, class_id (FK), admission_number (unique per school), date_of_birth, gender, enrollment_date, status (active/graduated/transferred/withdrawn)`. Index: `(school_id, class_id)`.

**`teachers`** — `id, user_id (FK unique), school_id, employee_number, hire_date, employment_type, department`.

**`parents`** — `id, user_id (FK unique), school_id, occupation, relationship_default`.

**`student_guardians`** — join table `student_id, parent_id, relationship (father/mother/guardian), is_primary_contact`. Many-to-many because siblings share parents and a student can have multiple guardians.

**`grade_levels`** — `id, school_id, name (e.g. "Grade 5"), order`.

**`classes`** — `id, school_id, grade_level_id (FK), name (e.g. "5A"), homeroom_teacher_id (FK teachers, nullable), academic_year_id (FK), capacity`. Index: `(school_id, academic_year_id)`.

**`academic_years`** — `id, school_id, name, start_date, end_date, is_current`. Everything time-boxed (enrollment, grades, timetable) hangs off this, so re-enrollment each year doesn't require destructive data changes.

**`subjects`** — `id, school_id, name, code`.

**`class_subjects`** — `id, class_id (FK), subject_id (FK), teacher_id (FK teachers)`. This is the authoritative "who teaches what to whom" table that attendance/grades/homework writes are validated against for teacher-ownership checks.

**`timetable_slots`** — `id, school_id, class_subject_id (FK), day_of_week, start_time, end_time, room`. Index: `(school_id, class_subject_id, day_of_week)`. Unique constraint on `(teacher_id-derived, day_of_week, start_time)` enforced at service layer to prevent double-booking.

**`teacher_attendance`** — `id, school_id, teacher_id (FK), check_in_at, check_out_at (nullable), working_hours (generated), is_late (bool), late_by_minutes, date (generated from check_in_at, for fast daily queries)`. Index: `(school_id, teacher_id, date)`.

**`student_attendance`** — `id, school_id, student_id (FK), class_subject_id (FK, nullable if daily-only mode), date, status (enum), arrived_at (nullable), recorded_by (FK teachers), locked_at (nullable)`. Index: `(school_id, student_id, date)`, `(school_id, class_subject_id, date)`.

**`attendance_excuses`** — `id, student_attendance_id (FK unique), reason, document_file_id (FK files, nullable), approved_by (FK users, nullable), status (pending/approved/rejected)`.

**`exams`** — `id, school_id, name, academic_year_id, exam_type (midterm/final/quiz), start_date, end_date`.

**`exam_subjects`** — `id, exam_id (FK), class_subject_id (FK), exam_date, max_score, weight`.

**`exam_results`** — `id, exam_subject_id (FK), student_id (FK), score, graded_by (FK teachers), graded_at`. Unique `(exam_subject_id, student_id)`. Index: `(school_id, student_id)`.

**`grading_scales`** — `id, school_id, name, ranges (jsonb: [{min, max, label}])`. Lets each school define A–F vs 0–100 vs custom without schema change.

**`homework`** — `id, school_id, class_subject_id (FK), title, description, due_date, created_by (FK teachers), attachment_file_id (FK files, nullable)`.

**`homework_submissions`** — `id, homework_id (FK), student_id (FK), submitted_at (nullable), file_id (FK files, nullable), grade (nullable), feedback`. Unique `(homework_id, student_id)`.

**`notifications`** — `id, school_id, title, body, type (announcement/alert/system), created_by, target_type (role/class/individual), created_at`.

**`notification_recipients`** — `id, notification_id (FK), user_id (FK), read_at (nullable)`. Index: `(user_id, read_at)` for fast unread-count queries.

**`fee_structures`** — `id, school_id, name, class_id (nullable = applies to all), amount, frequency (monthly/term/annual), academic_year_id`.

**`invoices`** — `id, school_id, student_id (FK), fee_structure_id (FK), amount_due, due_date, status (pending/paid/overdue/partial)`. Index: `(school_id, student_id, status)`.

**`payments`** — `id, invoice_id (FK), amount, method, paid_at, recorded_by (FK users), reference_number`.

**`payroll_structures`** — `id, school_id, teacher_id (FK unique-per-active-period), base_salary, allowances (jsonb), deductions (jsonb), effective_from`.

**`payslips`** — `id, payroll_structure_id (FK), period_month, gross, net, generated_at, status (draft/finalized/paid)`.

**`files`** — `id, school_id, bucket_key, original_name, mime_type, size_bytes, uploaded_by, visibility (private/school/public)`. Never store raw bytes; only R2 object metadata + presigned-URL issuance logic in the `files` service.

**`audit_logs`** — `id, school_id (nullable for platform actions), actor_id, action, entity_type, entity_id, before (jsonb), after (jsonb), created_at`. Partition by month at scale; append-only, no updates/deletes permitted at the application layer.

**`super_admins`** — separate table, separate auth realm, MFA-required, not part of `users`, deliberately outside RLS scope.

**`refresh_tokens`** — `id, user_id (FK), token_hash, device_info, expires_at, revoked_at (nullable)`. Storing the hash (not the raw token) means a DB leak doesn't hand out usable sessions; rotate on every refresh (reuse-detection: a revoked token used again revokes the whole family — signals theft).

### 7.3 Indexing Strategy
Every tenant-scoped table gets `school_id` as the leading column in its primary lookup index (composite, not a lone index on `school_id`) — since virtually every query filters by tenant first, this keeps queries tenant-local even before RLS kicks in. Foreign keys are indexed by default via Prisma relations. Hot paths (`student_attendance` by date, `notifications` unread count, `invoices` by status) get purpose-built composite indexes as listed above.

---

## 8. API Design (representative — full surface follows this pattern per module)

All endpoints prefixed `/api/v1`, require `Authorization: Bearer <access_token>` unless marked public, validated via Zod-derived DTOs (shared schema package between Nest and Next.js), scoped automatically to `school_id` from the JWT/subdomain.

### IAM
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | Public | `{ identifier (email/civilId), password, schoolSlug }` | `{ accessToken, user, permissions }` + refresh cookie |
| POST | `/auth/refresh` | Refresh cookie | — | `{ accessToken }` |
| POST | `/auth/logout` | Bearer | — | `204` + revokes refresh token, closes open teacher_attendance session |
| POST | `/auth/forgot-password` | Public | `{ email }` | `202` |
| GET | `/auth/me` | Bearer | — | `{ user, roles, permissions }` |

### Students
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/students` | `students:read` | Query: `page, limit, search, classId, status` | Paginated list |
| POST | `/students` | `students:write` | Full profile DTO | Created student |
| GET | `/students/:id` | `students:read` (self if Student/Parent) | — | Student detail |
| PATCH | `/students/:id` | `students:write` | Partial DTO | Updated student |
| DELETE | `/students/:id` | `students:write` (Admin only) | — | Soft-delete (status=withdrawn) |

### Attendance
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/attendance/students` | `attendance:write` + class ownership check | `{ classSubjectId, date, records: [{studentId, status, arrivedAt?}] }` | Bulk-created attendance rows |
| GET | `/attendance/students` | `attendance:read` (scoped) | Query: `studentId, classId, dateFrom, dateTo` | List + summary |
| GET | `/attendance/teachers/me/today` | Bearer (self) | — | Today's check-in/out state |
| GET | `/attendance/teachers` | `attendance:read` (HR/Admin) | Query: `teacherId, dateFrom, dateTo` | List + working-hours summary |

### Grades
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/exams/:examSubjectId/results` | `grades:write` + ownership | `{ results: [{studentId, score}] }` | Bulk upsert |
| GET | `/students/:id/grades` | `grades:read` (self/parent/teacher/admin) | Query: `academicYearId` | Report-card-shaped payload |

### Finance
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/invoices` | `finance:read` (scoped) | Query: `studentId, status` | List |
| POST | `/invoices/:id/payments` | `finance:write` or Parent (own invoice) | `{ amount, method, reference }` | Created payment, updates invoice status |

Every other module (Teachers, Parents, Classes, Subjects, Timetable, Homework, Payroll, Notifications, Reports, Settings) follows the same CRUD + scoped-query shape; full Swagger spec generated from Nest decorators is the source of truth once implementation begins rather than hand-duplicated here.

---

## 9. Folder Structure

### Backend (`apps/api`)
```
apps/api/src/
  main.ts
  app.module.ts
  core/
    tenancy/            # middleware, AsyncLocalStorage context, Prisma extension
    guards/              # JwtAuthGuard, PermissionsGuard, OwnershipGuard
    decorators/           # @CurrentUser, @RequirePermission, @Public
    filters/               # global exception filter
    interceptors/
  modules/
    iam/
      dto/  entities/  iam.controller.ts  iam.service.ts  iam.module.ts
    tenancy/
    students/
    teachers/
    parents/
    classes/
    subjects/
    timetable/
    attendance/
    exams/
    grades/
    homework/
    notifications/
    finance/
    payroll/
    reports/
    files/
    settings/
    audit/
  common/
    pipes/  utils/  constants/
prisma/
  schema.prisma
  migrations/
  seed.ts
```

### Frontend (`apps/web`)
```
apps/web/src/
  app/
    (auth)/login/
    (portal)/
      layout.tsx           # role-aware shell: sidebar + topbar
      dashboard/
      students/
      teachers/
      parents/
      classes/
      subjects/
      timetable/
      attendance/
      exams/
      grades/
      homework/
      finance/
      payroll/
      reports/
      settings/
    api/                     # Next.js route handlers if any BFF needs
  features/
    students/
      components/  hooks/  api.ts  schema.ts  store.ts
    teachers/
    attendance/
    ...one folder per module, mirroring backend module boundaries
  components/
    ui/                       # shadcn/ui primitives
    layout/                    # Sidebar, Topbar, Shell
    data-table/                 # shared table/pagination/filter components
  lib/
    api-client.ts               # TanStack Query client + fetch wrapper
    auth.ts
    rbac.ts                     # client-side permission-check helpers
    i18n/                        # RTL/LTR + locale strings
  stores/                        # Zustand: ui, auth-session, theme
```

Monorepo managed via Turborepo/pnpm workspaces: `apps/web`, `apps/api`, `packages/shared-schema` (Zod DTOs shared by both), `packages/ui` (optional design tokens package matching [DESIGN.md](DESIGN.md)).

---

## 10. Development Roadmap

**Phase 0 — Foundations (infra, not features)**
Monorepo scaffold, Docker Compose (Postgres, Redis for job queue/cache, API, Web), CI pipeline, Prisma schema for `schools`/`users`/`roles`/`permissions`, tenancy middleware + RLS policies proven with a smoke test (two fake schools, verify zero cross-tenant leakage). *Deliverable: a request can hit either tenant and never see the other's data.*

**Phase 1 — Authentication & RBAC**
Login/refresh/logout, permission guards, Super Admin realm, School Admin onboarding flow (create school → seed default roles → create first admin). *Deliverable: every role can log in and see a permission-filtered empty shell.*

**Phase 2 — School Structure**
Academic years, grade levels, classes, subjects, class_subjects, teacher/student/parent CRUD, student-guardian linking. *Deliverable: Admin can fully set up a school's structure and roster.*

**Phase 3 — Timetable**
Slot builder, conflict detection, per-role timetable views. *Deliverable: Teacher and Student portals show a real weekly schedule.*

**Phase 4 — Attendance**
Teacher auto clock-in/out + working hours, student attendance recording UI, excuse workflow, attendance reports. *Deliverable: both attendance flows are live end-to-end.*

**Phase 5 — Academics (Exams, Grades, Homework)**
Exam scheduling, gradebook, grading scales, report-card generation, homework creation/submission. *Deliverable: a full grading cycle can be run for one class.*

**Phase 6 — Notifications**
In-app + email dispatch, announcement broadcast, unread counts, notification preferences. *Deliverable: all portals show live notifications.*

**Phase 7 — Finance & Payroll**
Fee structures, invoicing, payment recording (manual/reconciliation first, gateway integration optional later), payroll structures, payslip generation. *Deliverable: Accountant and HR portals are functional.*

**Phase 8 — Reports & Analytics**
Cross-module dashboards, exportable PDF/Excel reports (attendance, academic, financial). *Deliverable: Principal/Admin dashboard shows real aggregated stats.*

**Phase 9 — Polish & Multi-Tenant Hardening**
RTL/LTR full audit, dark mode audit, load testing with simulated multi-school data, audit-log coverage review, security review (see §11), onboarding docs for the *second* real school. *Deliverable: platform is genuinely ready to onboard school #2 without code changes.*

Each phase ends with: passing tests for that module, Swagger docs updated, a working demo in the running Docker Compose stack.

---

## 11. Security & Scalability Notes

- **Password storage**: Argon2id, not bcrypt (better resistance to GPU cracking at reasonable cost parameters).
- **Rate limiting**: per-IP and per-account on `/auth/login` and `/auth/forgot-password` (Nest Throttler + Redis).
- **File access**: presigned URLs are short-lived (5 min) and scoped to the requesting user's permission on that specific file's `school_id`/owner — never a bare public bucket.
- **Audit log**: grade changes, payment records, permission changes, and student record deletions are always audit-logged with before/after diffs — this is what makes disputes ("who changed this grade") resolvable.
- **Horizontal scaling**: stateless API (session state lives in Postgres/Redis, not process memory) means the Nest app scales horizontally behind a load balancer without sticky sessions.
- **Read scaling**: Postgres read replica for `reports` module once a single school's data volume makes report queries contend with transactional traffic — not needed at launch, but the module boundary makes it a config change, not a rewrite.
- **Background jobs**: BullMQ (Redis-backed) for payslip generation, report exports, notification fan-out — keeps request/response cycles fast and makes retries/observability first-class instead of fire-and-forget promises.

---

## 12. Suggested Improvements Beyond the Original Spec

1. **Academic year as a first-class dimension** (added above, not in original spec) — without it, re-enrollment each year either mutates history or requires ad-hoc workarounds. Worth confirming this matches how the school actually operates before Phase 2.
2. **Ownership-scoped RBAC**, not role-only — a plain role table answers "can a Teacher grade" but not "can *this* teacher grade *this* class"; flagged explicitly in §1 and §4 because it's the detail most RBAC implementations miss until a real incident forces the fix.
3. **Soft-delete over hard-delete** for students/teachers/records — school data has legal retention implications (grade disputes, transfer records); status fields (`withdrawn`, `archived`) instead of `DELETE` rows, with the Prohibited Actions boundary this assistant operates under making permanent deletion something a human explicitly does anyway.
4. **Configurable attendance mode** (per-period vs. daily) — schools vary; hardcoding one mode into the schema would force a painful migration for the first school that doesn't fit it.
5. **Notification read-receipts** already modeled (`notification_recipients.read_at`) so an unread badge count is a cheap indexed query, not a full-table scan at dashboard load.

---

*This document is the source of truth for planning. No implementation code has been generated. Design tokens (colors, typography, spacing) are already defined in [DESIGN.md](DESIGN.md) and should be treated as binding for all UI work in later phases.*
