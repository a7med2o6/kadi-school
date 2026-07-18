import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Passw0rd!'; // dev-only seed data, never used outside local/CI environments

const PERMISSIONS = [
  { key: 'users:read', module: 'iam', description: 'View staff/user accounts in the school' },
  { key: 'users:write', module: 'iam', description: 'Manage staff/user accounts in the school' },
  { key: 'students:read', module: 'students', description: 'View student records' },
  { key: 'students:write', module: 'students', description: 'Manage student records' },
  { key: 'teachers:read', module: 'teachers', description: 'View teacher records' },
  { key: 'teachers:write', module: 'teachers', description: 'Manage teacher records' },
  { key: 'parents:read', module: 'parents', description: 'View parent/guardian records' },
  { key: 'parents:write', module: 'parents', description: 'Manage parent/guardian records' },
  { key: 'classes:read', module: 'classes', description: 'View academic years, grade levels, classes' },
  { key: 'classes:write', module: 'classes', description: 'Manage academic years, grade levels, classes' },
  { key: 'subjects:read', module: 'subjects', description: 'View subjects and class-subject assignments' },
  { key: 'subjects:write', module: 'subjects', description: 'Manage subjects and class-subject assignments' },
  { key: 'timetable:read', module: 'timetable', description: 'View timetable' },
  { key: 'timetable:write', module: 'timetable', description: 'Manage timetable slots' },
  { key: 'attendance:read', module: 'attendance', description: 'View attendance records' },
  { key: 'attendance:write', module: 'attendance', description: 'Record attendance' },
  { key: 'grades:read', module: 'grades', description: 'View grades' },
  { key: 'grades:write', module: 'grades', description: 'Enter/edit grades' },
  { key: 'homework:read', module: 'homework', description: 'View homework' },
  { key: 'homework:write', module: 'homework', description: 'Create/grade homework' },
  { key: 'notifications:read', module: 'notifications', description: 'View notifications' },
  { key: 'notifications:write', module: 'notifications', description: 'Send notifications/announcements' },
  { key: 'finance:read', module: 'finance', description: 'View invoices/payments' },
  { key: 'finance:write', module: 'finance', description: 'Manage invoices/payments' },
  { key: 'payroll:read', module: 'payroll', description: 'View payroll' },
  { key: 'payroll:write', module: 'payroll', description: 'Manage payroll' },
] as const;

const ALL_KEYS = PERMISSIONS.map((p) => p.key);
const ALL_READ = ALL_KEYS.filter((k) => k.endsWith(':read'));

const DEFAULT_ROLES: { name: string; permissions: readonly string[] }[] = [
  { name: 'School Admin', permissions: ALL_KEYS },
  { name: 'Principal', permissions: ALL_READ },
  { name: 'Vice Principal', permissions: [...ALL_READ, 'timetable:write'] },
  {
    name: 'Teacher',
    permissions: [
      'students:read',
      'classes:read',
      'subjects:read',
      'timetable:read',
      'attendance:write',
      'grades:write',
      'homework:write',
    ],
  },
  {
    name: 'Student',
    permissions: ['timetable:read', 'grades:read', 'homework:read', 'attendance:read', 'notifications:read'],
  },
  {
    name: 'Parent',
    permissions: [
      'timetable:read',
      'grades:read',
      'homework:read',
      'attendance:read',
      'notifications:read',
      'finance:read',
    ],
  },
  { name: 'HR', permissions: ['users:read', 'teachers:read', 'teachers:write', 'payroll:write'] },
  { name: 'Accountant', permissions: ['finance:write', 'payroll:read'] },
  {
    name: 'Reception',
    permissions: ['users:read', 'students:read', 'students:write', 'parents:read', 'parents:write', 'notifications:write'],
  },
];

async function seedPermissionCatalog() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { module: permission.module, description: permission.description },
      create: permission,
    });
  }
}

async function seedDefaultRoles() {
  for (const role of DEFAULT_ROLES) {
    const created = await prisma.role.upsert({
      where: { id: (await prisma.role.findFirst({ where: { schoolId: null, name: role.name } }))?.id ?? '__none__' },
      update: {},
      create: { name: role.name, schoolId: null, isSystemDefault: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    for (const key of role.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.create({ data: { roleId: created.id, permissionId: permission.id } });
    }
  }
}

async function seedProofSchools() {
  console.log('Seeding two schools to prove tenant isolation...');

  const schoolAdminRole = await prisma.role.findFirstOrThrow({
    where: { schoolId: null, name: 'School Admin' },
  });
  const passwordHash = await argon2.hash(SEED_PASSWORD);

  for (const slug of ['school-a', 'school-b']) {
    const school = await prisma.school.upsert({
      where: { slug },
      update: {},
      create: { name: `${slug} (proof)`, slug, subdomain: slug },
    });

    const admin = await prisma.user.upsert({
      where: { schoolId_email: { schoolId: school.id, email: `admin@${slug}.test` } },
      update: { passwordHash },
      create: { schoolId: school.id, email: `admin@${slug}.test`, passwordHash },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: schoolAdminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: schoolAdminRole.id },
    });

    console.log(`  ${school.slug}: ${admin.email} / password: ${SEED_PASSWORD}`);
  }
}

async function seedSuperAdmin() {
  const passwordHash = await argon2.hash(SEED_PASSWORD);
  await prisma.superAdmin.upsert({
    where: { email: 'super@kadischool.dev' },
    update: { passwordHash },
    create: { email: 'super@kadischool.dev', passwordHash, name: 'Platform Super Admin' },
  });
  console.log(`  super admin: super@kadischool.dev / password: ${SEED_PASSWORD}`);
}

async function main() {
  console.log('Seeding permission catalog and default roles...');
  await seedPermissionCatalog();
  await seedDefaultRoles();
  await seedProofSchools();
  await seedSuperAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
