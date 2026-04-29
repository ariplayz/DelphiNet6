import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const BUILT_IN_ROLES: { name: string; permissions: string[]; description: string }[] = [
  {
    name: 'super_admin',
    description: 'Full system access across all schools',
    permissions: ['super_admin.all'],
  },
  {
    name: 'school_admin',
    description: 'Manages a single school — users, classes, programs, settings',
    permissions: [
      'school.manage', 'users.manage', 'roles.assign', 'class.manage',
      'class.view', 'attendance.record', 'attendance.verify', 'attendance.view_all',
      'attendance.amend', 'restriction.view', 'program.view', 'program.view_others',
      'program.edit', 'program.edit_template', 'ethics.review', 'routing.handle',
      'routing.start', 'analytics.view', 'dashboard.admin', 'reslife.manage',
      'dorm.view_all', 'dorm.roll_call',
    ],
  },
  {
    name: 'supervisor',
    description: 'Teaches / supervises classes; takes roll call',
    permissions: [
      'class.view', 'class.supervise', 'attendance.record',
      'attendance.view_all', 'program.view', 'program.view_others',
      'program.edit', 'routing.start', 'routing.handle', 'success_story.verify',
    ],
  },
  {
    name: 'student_council',
    description: 'Verifies and excuses attendance points',
    permissions: ['attendance.verify', 'attendance.view_all', 'restriction.view'],
  },
  {
    name: 'attendance_verifier',
    description: 'Can verify attendance entries (legacy role)',
    permissions: ['attendance.verify', 'attendance.view_all'],
  },
  {
    name: 'program_viewer',
    description: "Can view other students' programs",
    permissions: ['program.view', 'program.view_others'],
  },
  {
    name: 'ethics_officer',
    description: 'Writes and reviews ethics reports',
    permissions: ['ethics.write', 'ethics.review'],
  },
  {
    name: 'routing_handler',
    description: 'Handles routing forms',
    permissions: ['routing.handle', 'routing.start'],
  },
  {
    name: 'parent',
    description: "Read-only access to their child's information",
    permissions: ['program.view'],
  },
  {
    name: 'student',
    description: 'Standard student access',
    permissions: ['program.view', 'class.view', 'routing.start', 'ethics.write'],
  },
  {
    name: 'staff',
    description: 'General staff access',
    permissions: ['class.view', 'program.view', 'routing.start', 'routing.handle'],
  },
  {
    name: 'residential_life',
    description: 'Manages dorms, rooms, and dorm roll-call schedules',
    permissions: ['reslife.manage', 'restriction.view', 'dorm.view_all'],
  },
  {
    name: 'dorm_captain',
    description: 'Takes dorm roll calls (morning and evening)',
    permissions: ['dorm.roll_call', 'dorm.view_own'],
  },
];

async function main() {
  console.log('🌱 Seeding DelphiNet 6...');

  // ── Seed built-in roles (school_id = null) ──
  const roleMap: Record<string, string> = {};
  for (const r of BUILT_IN_ROLES) {
    // Use findFirst + create/update because Prisma upsert with null in a
    // compound unique index requires special handling in PostgreSQL
    let role = await prisma.role.findFirst({
      where: { schoolId: null, name: r.name },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: r.name,
          description: r.description,
          isBuiltIn: true,
          schoolId: null,
          rolePermissions: {
            createMany: {
              data: r.permissions.map((p) => ({ permission: p })),
              skipDuplicates: true,
            },
          },
        },
      });
    }
    roleMap[r.name] = role.id;
  }
  console.log('✅ Built-in roles seeded');

  // ── Seed the default school: The Delphian School (Sheridan) ──
  // DelphiNet 6 ships configured for The Delphian School in Sheridan, OR as
  // the single default tenant. From the super-admin panel additional schools
  // — including the Delphi Academies in other cities — can be added later.
  const school = await prisma.school.upsert({
    where: { id: 'delphian-sheridan' },
    create: {
      id: 'delphian-sheridan',
      name: 'The Delphian School',
      timezone: 'America/Los_Angeles',
    },
    update: { name: 'The Delphian School' },
  });
  console.log(`✅ School: ${school.name}`);

  // ── Seed super-admin user ──
  const passwordHash = await argon2.hash('adminpassword');
  const superAdmin = await prisma.user.upsert({
    where: { schoolId_email: { schoolId: school.id, email: 'ari@aricummings.com' } },
    create: {
      schoolId: school.id,
      email: 'ari@aricummings.com',
      passwordHash,
      firstName: 'Ari',
      lastName: 'Cummings',
      isSuperAdmin: true,
    },
    update: {},
  });

  // Grant super_admin role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdmin.id, roleId: roleMap['super_admin'] } },
    create: { userId: superAdmin.id, roleId: roleMap['super_admin'] },
    update: {},
  });

  console.log(`✅ Super-admin: ${superAdmin.email}`);

  // ── Seed reference pages ──
  const pages = [
    { slug: 'hard-to-find-words', title: 'Hard to Find Words', body: '# Hard to Find Words\n\nContent coming soon.' },
    { slug: 'math-facts', title: 'Math Facts', body: '# Math Facts\n\nContent coming soon.' },
    { slug: 'meal-menus', title: 'Meal Menus', body: '# Meal Menus\n\nContent coming soon.' },
  ];
  for (const p of pages) {
    await prisma.referencePage.upsert({
      where: { schoolId_slug: { schoolId: school.id, slug: p.slug } },
      create: { ...p, schoolId: school.id },
      update: {},
    });
  }
  console.log('✅ Reference pages seeded');

  console.log('\n🎉 Seed complete!');
  console.log('   Super-admin email: ari@aricummings.com');
  console.log('   (password set from initial bootstrap; change it on first login)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
