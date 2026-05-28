import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });

export const E2E_PASSWORD = "Playwright!Test_12345";

const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export interface E2EUser {
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export const E2E_USERS: Record<"secretary" | "viewer" | "inactive", E2EUser> = {
  secretary: {
    username: "e2e_secretary",
    email: "e2e_secretary@amdc.gob.hn",
    fullName: "E2E Secretary",
    role: Role.SECRETARY,
    isActive: true,
  },
  viewer: {
    username: "e2e_viewer",
    email: "e2e_viewer@amdc.gob.hn",
    fullName: "E2E Viewer",
    role: Role.VIEWER,
    isActive: true,
  },
  inactive: {
    username: "e2e_inactive",
    email: "e2e_inactive@amdc.gob.hn",
    fullName: "E2E Inactive",
    role: Role.SECRETARY,
    isActive: false,
  },
};

export async function setupTestUsers() {
  const passwordHash = await hash(E2E_PASSWORD, ARGON2);

  for (const u of Object.values(E2E_USERS)) {
    await prisma.user.upsert({
      where: { username: u.username },
      create: { ...u, passwordHash },
      update: { ...u, passwordHash },
    });
  }
}

export async function cleanupTestUsers() {
  await prisma.auditLog.deleteMany({
    where: { userId: { in: await testUserIds() } },
  });
  await prisma.user.deleteMany({
    where: { username: { in: Object.values(E2E_USERS).map((u) => u.username) } },
  });
}

async function testUserIds() {
  const users = await prisma.user.findMany({
    where: { username: { in: Object.values(E2E_USERS).map((u) => u.username) } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
