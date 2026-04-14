import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sirer.gov' },
    update: {},
    create: {
      email: 'admin@sirer.gov',
      passwordHash: hash,
      fullName: 'Administrateur Central SIRER',
      role: 'ADMIN_CENTRAL',
    },
  });

  await prisma.user.upsert({
    where: { email: 'somin@sirer.gov' },
    update: {},
    create: {
      email: 'somin@sirer.gov',
      passwordHash: hash,
      fullName: 'Somin SIRER',
      role: 'ADMIN_CENTRAL',
    },
  });

  const testHash = await bcrypt.hash('@Test2026', 12);
  await prisma.user.upsert({
    where: { email: 'admin_test@sirer.gov' },
    update: { passwordHash: testHash },
    create: {
      email: 'admin_test@sirer.gov',
      passwordHash: testHash,
      fullName: 'Admin_test',
      role: 'ADMIN_CENTRAL',
    },
  });

  const provinces = [
    { code: 'KN', name: 'Kinshasa' },
    { code: 'BC', name: 'Kongo-Central' },
    { code: 'KG', name: 'Kwango' },
    { code: 'KL', name: 'Kwilu' },
    { code: 'MN', name: 'Maï-Ndombe' },
    { code: 'KS', name: 'Kasaï' },
    { code: 'KC', name: 'Kasaï-Central' },
    { code: 'KO', name: 'Kasaï-Oriental' },
    { code: 'LO', name: 'Lomami' },
    { code: 'SA', name: 'Sankuru' },
    { code: 'MA', name: 'Maniema' },
    { code: 'SK', name: 'Sud-Kivu' },
    { code: 'NK', name: 'Nord-Kivu' },
    { code: 'IT', name: 'Ituri' },
    { code: 'HU', name: 'Haut-Uele' },
    { code: 'BU', name: 'Bas-Uele' },
    { code: 'TS', name: 'Tshopo' },
    { code: 'TP', name: 'Tshuapa' },
    { code: 'EQ', name: 'Équateur' },
    { code: 'NU', name: 'Nord-Ubangi' },
    { code: 'SU', name: 'Sud-Ubangi' },
    { code: 'MO', name: 'Mongala' },
    { code: 'HK', name: 'Haut-Katanga' },
    { code: 'HL', name: 'Haut-Lomami' },
    { code: 'LU', name: 'Lualaba' },
    { code: 'TA', name: 'Tanganyika' },
  ];

  for (const p of provinces) {
    const existing = await prisma.province.findUnique({ where: { code: p.code } });
    if (existing) {
      await prisma.province.update({ where: { id: existing.id }, data: { name: p.name } });
    } else {
      await prisma.province.create({ data: p });
    }
  }

  const kins = await prisma.province.findUnique({ where: { code: 'KN' } });
  if (kins) {
    await prisma.user.upsert({
      where: { email: 'agent.centre@sirer.gov' },
      update: { provinceId: kins.id },
      create: {
        email: 'agent.centre@sirer.gov',
        passwordHash: hash,
        fullName: 'Agent Provincial Kinshasa',
        role: 'AGENT_PROVINCIAL',
        provinceId: kins.id,
      },
    });
    await prisma.user.upsert({
      where: { email: 'recensement.centre@sirer.gov' },
      update: { provinceId: kins.id },
      create: {
        email: 'recensement.centre@sirer.gov',
        passwordHash: hash,
        fullName: 'Agent Recensement Kinshasa',
        role: 'AGENT_RECENSEMENT',
        provinceId: kins.id,
      },
    });
  }

  const superAdminHash = await bcrypt.hash('@Cosmas3108', 12);
  await prisma.user.upsert({
    where: { email: 'orient.kitete112@gmail.com' },
    update: { passwordHash: superAdminHash, role: 'SUPER_ADMIN' },
    create: {
      email: 'orient.kitete112@gmail.com',
      passwordHash: superAdminHash,
      fullName: 'Super Administrateur',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Seed OK:', { admin: admin.email, provinces: provinces.length });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
