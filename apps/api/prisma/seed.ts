import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding two schools to prove tenant isolation...');

  const schoolA = await prisma.school.upsert({
    where: { slug: 'school-a' },
    update: {},
    create: { name: 'School A (proof)', slug: 'school-a', subdomain: 'school-a' },
  });

  const schoolB = await prisma.school.upsert({
    where: { slug: 'school-b' },
    update: {},
    create: { name: 'School B (proof)', slug: 'school-b', subdomain: 'school-b' },
  });

  const userA = await prisma.user.upsert({
    where: { schoolId_email: { schoolId: schoolA.id, email: 'admin@school-a.test' } },
    update: {},
    create: {
      schoolId: schoolA.id,
      email: 'admin@school-a.test',
      passwordHash: 'seed-only-not-a-real-hash',
    },
  });

  const userB = await prisma.user.upsert({
    where: { schoolId_email: { schoolId: schoolB.id, email: 'admin@school-b.test' } },
    update: {},
    create: {
      schoolId: schoolB.id,
      email: 'admin@school-b.test',
      passwordHash: 'seed-only-not-a-real-hash',
    },
  });

  console.log(`Seeded ${schoolA.slug} (${userA.email}) and ${schoolB.slug} (${userB.email})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
