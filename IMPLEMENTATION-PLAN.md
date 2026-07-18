# Kadi School — خطة التنفيذ التفصيلية (Step-by-Step)

مرجع تنفيذي مبني على [ARCHITECTURE.md](ARCHITECTURE.md). كل Phase هنا مقسّم لخطوات صغيرة قابلة للتنفيذ بالترتيب، وكل خطوة ليها "Definition of Done" واضح عشان تعرف امتى تنتقل للي بعدها. لسه من غير كود — دي خريطة تنفيذ.

**قاعدة عامة:** ما تبدأش Phase جديد قبل ما الـ DoD بتاع اللي قبله يتحقق فعليًا (تشغيل + اختبار يدوي)، مش بس "خلصت الكود".

---

## Phase 0 — البنية التحتية (Foundations)
**الهدف:** بيئة تشتغل، من غير أي feature حقيقية لسه.

1. إنشاء Monorepo (pnpm workspaces + Turborepo): `apps/web`, `apps/api`, `packages/shared-schema`.
2. إعداد `docker-compose.yml`: Postgres, Redis, API container, Web container.
3. إعداد NestJS project skeleton (`apps/api`) + Prisma init + connection على Postgres جوه Docker.
4. إعداد Next.js App Router project (`apps/web`) + Tailwind + shadcn/ui + ربط بالـ design tokens من [DESIGN.md](DESIGN.md).
5. إعداد ESLint / Prettier / TypeScript strict mode على المستويين.
6. إعداد CI أساسي (lint + typecheck + build) — GitHub Actions مثلاً.
7. Prisma schema أولي: `schools`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles` فقط.
8. بناء `TenancyModule`: middleware يحلل subdomain، `AsyncLocalStorage` context، Prisma Client Extension للـ auto-scoping.
9. تفعيل Postgres RLS policies على الجداول الأولى كـ proof of concept.
10. **اختبار الإثبات (لازم ينفذ فعليًا):** إنشاء مدرستين وهميتين (seed script)، وتأكيد إن request لمدرسة A مستحيل يشوف بيانات مدرسة B — حتى لو حصل خطأ في query.

**DoD:** `docker compose up` يشغّل الكل، وفيه اختبار يثبت عزل البيانات بين مدرستين.

---

## Phase 1 — Authentication & RBAC
**الهدف:** كل الأدوار تقدر تسجّل دخول وتشوف شل فاضي حسب صلاحياتها.

1. `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/me`.
2. Argon2id للباسورد، refresh token مخزّن كـ hash مع rotation + reuse detection.
3. `JwtAuthGuard`, `PermissionsGuard`, `@RequirePermission()` decorator.
4. جدول `super_admins` منفصل + realm خاص بيه + endpoint لإنشاء مدرسة جديدة (school onboarding).
5. School onboarding flow: إنشاء `school` → seed الأدوار الافتراضية (Super Admin, School Admin, Principal...) → إنشاء أول School Admin.
6. Frontend: صفحة Login (تدعم identifier = email أو civil ID)، `AuthProvider`, Zustand store للـ session، `rbac.ts` helper لإخفاء عناصر الواجهة حسب الصلاحيات.
7. Layout الأساسي: Sidebar ديناميكي يتبني من الصلاحيات المرجعة من `/auth/me`، Topbar، دعم Dark/Light + RTL/LTR من أول يوم.

**DoD:** كل الـ 10 أدوار تقدر تسجل دخول، والـ Sidebar يختلف فعليًا حسب الدور (تجربة يدوية بـ 3 أدوار مختلفة على الأقل).

---

## Phase 2 — School Structure (الهيكل الأساسي)
**الهدف:** الأدمن يقدر يبني هيكل المدرسة بالكامل.

1. `academic_years` CRUD + "current year" logic.
2. `grade_levels` + `classes` CRUD (مع `homeroom_teacher_id`).
3. `subjects` CRUD.
4. `class_subjects` (ربط فصل + مادة + مدرس) — دي الجدول اللي هيتبني عليه كل الـ ownership checks بعدين.
5. `teachers` CRUD (profile extension على `users`).
6. `students` CRUD + enrollment (ربط بفصل).
7. `parents` CRUD + `student_guardians` (ربط أب/أم/ولي أمر بأكتر من طالب).
8. Frontend: صفحات Students / Teachers / Parents / Classes / Subjects — كل واحدة: Data Table (بحث + فلاتر + pagination) + Form (React Hook Form + Zod) + صفحة تفاصيل.

**DoD:** تقدر تدخل كأدمن وتبني مدرسة كاملة من الصفر: سنة دراسية، فصول، مواد، مدرسين، طلاب، أولياء أمور — وتشوفهم مترابطين صح.

---

## Phase 3 — Timetable
1. `timetable_slots` CRUD (يوم، وقت، فصل-مادة، قاعة).
2. Conflict detection عند الحفظ (نفس المدرس في وقتين متقاطعين، أو نفس القاعة).
3. Frontend: Timetable builder للأدمن (grid view)، وعرض read-only للمدرس والطالب حسب انتماءه.

**DoD:** جدول حصص كامل لأسبوع، ويظهر صح في بورتال المدرس والطالب.

---

## Phase 4 — Attendance
1. Backend: تسجيل `teacher_attendance` تلقائي عند أول login في اليوم، وإغلاق الجلسة عند logout، حساب `working_hours` و`is_late` بناءً على `school_settings.work_start_time`.
2. `student_attendance` bulk endpoint (المدرس يسجل حضور فصل كامل مرة واحدة).
3. `attendance_excuses` workflow (تقديم عذر → موافقة/رفض).
4. قفل التعديل بعد وقت معين من اليوم (configurable)، مع إمكانية تعديل استثنائي من الأدمن (audit logged).
5. Frontend: شاشة أخذ الحضور للمدرس (grid سريع: حاضر/غايب/متأخر/معذور)، وشاشة عرض الحضور للطالب/ولي الأمر، وتقرير حضور للأدمن.

**DoD:** المدرس يسجل دخوله فيتسجل تلقائي، يفتح فصل ويأخذ حضور الطلاب، وولي الأمر يشوف حضور ابنه لحظيًا.

---

## Phase 5 — Academics (Exams, Grades, Homework)
1. `exams` + `exam_subjects` CRUD (جدولة الامتحانات).
2. `exam_results` bulk entry endpoint + ownership check (المدرس بس اللي بيدرّس المادة).
3. `grading_scales` (قابلة للتخصيص لكل مدرسة).
4. Report card generation (تجميع النتائج حسب الطالب/السنة).
5. `homework` CRUD + `homework_submissions` (رفع ملفات عبر `files` module / R2 presigned URLs).
6. Frontend: Gradebook للمدرس، صفحة درجات للطالب/ولي الأمر، إنشاء وتسليم واجبات.

**DoD:** دورة تقييم كاملة لفصل واحد: امتحان → إدخال درجات → ظهورها في بورتال الطالب وولي الأمر، وواجب يتسلّم ويتصحح.

---

## Phase 6 — Notifications
1. `notifications` + `notification_recipients` + BullMQ job للـ fan-out (خصوصًا للإعلانات العامة اللي بتوصل لآلاف المستخدمين).
2. قنوات: in-app (لازم) + email (اختياري حسب الإعداد) + push (لاحقًا).
3. Frontend: جرس إشعارات بعدد غير مقروء، صفحة إعلانات المدرسة.

**DoD:** إشعار يتبعت من الأدمن ويوصل لحظيًا لكل الأدوار المستهدفة، والعداد يتحدث صح.

---

## Phase 7 — Finance & Payroll
1. `fee_structures`, `invoices`, `payments` CRUD.
2. Payment recording يدوي أولًا (بدون gateway حقيقي)، مع structure جاهزة لإضافة gateway لاحقًا.
3. `payroll_structures`, `payslips` generation (background job).
4. Frontend: بورتال Accountant (فواتير، مدفوعات)، بورتال HR (رواتب)، صفحة فواتير ولي الأمر مع دفع.

**DoD:** فاتورة تتنشأ لطالب، ولي الأمر يشوفها ويسجل دفعها، والمحاسب يشوف التقرير المالي محدّث.

---

## Phase 8 — Reports & Analytics
1. Aggregation queries/views لكل موديول (حضور، أكاديمي، مالي).
2. Export PDF/Excel.
3. Dashboard widgets حسب الدور (الأدمن يشوف كل حاجة، المدرس يشوف فصوله بس... إلخ).

**DoD:** Dashboard حقيقي بأرقام حقيقية، وتقرير قابل للتصدير.

---

## Phase 9 — Polish & Multi-Tenant Hardening
1. مراجعة كاملة RTL/LTR على كل الشاشات.
2. مراجعة Dark Mode على كل الشاشات.
3. Load test بمدارس وهمية متعددة (تأكيد إن الأداء ثابت مع زيادة الـ tenants).
4. Security review (rate limiting، presigned URL scoping، audit log coverage).
5. **الاختبار الحاسم:** تجربة onboarding مدرسة تانية حقيقية من غير أي تعديل كود.

**DoD:** مدرسة ثانية اشتغلت بنجاح بدون تغيير كود = المشروع فعلاً Multi-Tenant.

---

## من فين نبدأ فعليًا؟

الخطوة الأولى الملموسة قدامك دلوقتي هي **Phase 0, خطوة 1-3**: إنشاء الـ monorepo + Docker Compose + NestJS skeleton. لو عايز أبدأ معاك فيها، قولي "ابدأ Phase 0" وهنفّذها خطوة خطوة (لسه من غير أكواد features — بس السكيلتون والإعدادات).
