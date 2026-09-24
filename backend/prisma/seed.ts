import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const hashPw = (pw: string) =>
  argon2.hash(pw, { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 });

async function main() {
  console.log('🌱 Starting full database seeding…');

  // ── 1. Default Organisation ────────────────────────────────────────────────
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'EMT Group',
        slug: 'emt-group',
        plan: 'ENTERPRISE',
        subscriptionTier: 'ENTERPRISE',
        quotaMessagesLimit: 10_000_000,
        quotaAccountsLimit: 1000,
      },
    });
    console.log('✅ Organisation created:', org.slug);
  } else {
    console.log('ℹ️  Organisation already exists:', org.slug);
  }

  // ── 2. Seed Users per Role ─────────────────────────────────────────────────
  const users = [
    {
      email: 'admin@telegram-saas.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPass2026!',
      name: 'Super Administrator',
      role: 'OWNER',
      plan: 'ENTERPRISE',
      tier: 'ENTERPRISE',
      msgLimit: 1_000_000,
      accLimit: 500,
      badge: '👑 OWNER / SUPER ADMIN',
    },
    {
      email: 'admin2@telegram-saas.com',
      password: 'AdminPass2026!',
      name: 'Organisation Admin',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      tier: 'ENTERPRISE',
      msgLimit: 500_000,
      accLimit: 200,
      badge: '🛡️ ADMIN',
    },
    {
      email: 'member@telegram-saas.com',
      password: 'UserPass2026!',
      name: 'Pro Member',
      role: 'MEMBER',
      plan: 'PRO',
      tier: 'PRO',
      msgLimit: 50_000,
      accLimit: 20,
      badge: '⭐ MEMBER / PRO',
    },
    {
      email: 'viewer@telegram-saas.com',
      password: 'UserPass2026!',
      name: 'Free Viewer',
      role: 'VIEWER',
      plan: 'FREE',
      tier: 'FREE',
      msgLimit: 5_000,
      accLimit: 3,
      badge: '👤 VIEWER / FREE',
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email.toLowerCase() } });
    if (existing) {
      console.log(`ℹ️  User already exists: ${u.email} (${u.role})`);
      continue;
    }

    const passwordHash = await hashPw(u.password);
    const created = await prisma.user.create({
      data: {
        email: u.email.toLowerCase(),
        passwordHash,
        name: u.name,
        role: u.role,
        plan: u.plan,
        subscriptionTier: u.tier,
        quotaMessagesLimit: u.msgLimit,
        quotaAccountsLimit: u.accLimit,
        isActive: true,
        orgId: org.id,
      },
    });

    // Membership link
    await prisma.membership.upsert({
      where: { userId_orgId: { userId: created.id, orgId: org.id } },
      create: { userId: created.id, orgId: org.id, role: u.role },
      update: {},
    });

    console.log(`✅ Seeded ${u.badge}`);
    console.log(`   Email:    ${u.email}`);
    console.log(`   Password: ${u.password}`);
    console.log(`   Quota:    ${u.msgLimit.toLocaleString()} messages / ${u.accLimit} accounts`);
    console.log('');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DEMO LOGIN ACCOUNTS (copy & paste)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const u of users) {
    console.log(` ${u.badge}`);
    console.log(`   ${u.email}  /  ${u.password}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
