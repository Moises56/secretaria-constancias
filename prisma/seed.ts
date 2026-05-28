import "dotenv/config";

import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { ConstanciaType, PrismaClient, Role } from "@prisma/client";

// argon2id en el sweet spot recomendado por OWASP 2024:
//   memoryCost = 19456 KiB (~19 MiB)
//   timeCost   = 2 iteraciones
//   parallelism = 1
// Ajustes que también usa el flujo de autenticación de FASE 3.
const ARGON2 = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Falta ${name} en .env`);
  }
  return v;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const adminUsername = requireEnv("SEED_ADMIN_USERNAME");
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("→ Hash de password con argon2id…");
    const passwordHash = await hash(adminPassword, ARGON2);

    console.log(`→ Upsert admin (${adminUsername.toLowerCase()})`);
    const admin = await prisma.user.upsert({
      where: { username: adminUsername.toLowerCase() },
      update: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        fullName: "Administrador del Sistema",
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        username: adminUsername.toLowerCase(),
        email: adminEmail.toLowerCase(),
        passwordHash,
        fullName: "Administrador del Sistema",
        role: Role.ADMIN,
      },
    });
    console.log(`   ✓ admin id=${admin.id}`);

    // Firmantes — los strings de fullName y titleLine se imprimen LITERALES en
    // los PDFs (snapshot inmutable). Cualquier coma, tilde o mayúscula cuenta.
    const signers = [
      {
        fullName: "Diana Alejandra Cruz Rivera",
        titleLine: "Acuerdo de Delegación N.001 AMDC-SM-2026",
        defaultForTypes: [ConstanciaType.CVD, ConstanciaType.CVP],
      },
      {
        fullName: "César Antonio Pinto Pacheco",
        titleLine: "Secretario Municipal del Distrito Central",
        defaultForTypes: [ConstanciaType.CVE],
      },
    ] as const;

    for (const s of signers) {
      console.log(`→ Upsert signer ${s.fullName}`);
      // Signer no tiene unique en fullName, así que detectamos por nombre+titleLine.
      const existing = await prisma.signer.findFirst({
        where: { fullName: s.fullName, titleLine: s.titleLine },
      });
      if (existing) {
        const updated = await prisma.signer.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            defaultForTypes: [...s.defaultForTypes],
          },
        });
        console.log(`   ✓ updated id=${updated.id}`);
      } else {
        const created = await prisma.signer.create({
          data: {
            fullName: s.fullName,
            titleLine: s.titleLine,
            defaultForTypes: [...s.defaultForTypes],
          },
        });
        console.log(`   ✓ created id=${created.id}`);
      }
    }

    // ── Usuarios de desarrollo (NO en producción) ──────────────────────────
    // Permiten validar visualmente los flujos de SECRETARY y VIEWER sin
    // necesidad de crear cuentas manualmente desde Prisma Studio.
    // Las credenciales están documentadas en README sección "Desarrollo".
    if (process.env.NODE_ENV !== "production") {
      const DEV_PASSWORD = "DevTest!2026";
      const devPasswordHash = await hash(DEV_PASSWORD, ARGON2);
      const devUsers = [
        {
          username: "test_secretary",
          email: "test_secretary@amdc.local",
          fullName: "Secretaría de Prueba",
          role: Role.SECRETARY,
        },
        {
          username: "test_viewer",
          email: "test_viewer@amdc.local",
          fullName: "Consulta de Prueba",
          role: Role.VIEWER,
        },
      ] as const;
      for (const u of devUsers) {
        console.log(`→ Upsert dev user ${u.username} (${u.role})`);
        await prisma.user.upsert({
          where: { username: u.username },
          create: { ...u, passwordHash: devPasswordHash, isActive: true },
          update: { ...u, passwordHash: devPasswordHash, isActive: true },
        });
      }
      console.log(`   ✓ password compartida: ${DEV_PASSWORD}`);
    }

    // Repara FolioSequence si quedó desincronizado con Constancia (ej. tras
    // restaurar un dump parcial o borrar constancias manualmente). Sin esto,
    // la próxima emisión del mismo tipo/año choca con unique constraint
    // (type, folioYear, folioNumber).
    const folioStats = await prisma.constancia.groupBy({
      by: ["type", "folioYear"],
      _max: { folioNumber: true },
    });
    for (const row of folioStats) {
      const maxNumber = row._max.folioNumber ?? 0;
      const seq = await prisma.folioSequence.findUnique({
        where: { type_year: { type: row.type, year: row.folioYear } },
        select: { lastNumber: true },
      });
      if (!seq || seq.lastNumber < maxNumber) {
        await prisma.folioSequence.upsert({
          where: { type_year: { type: row.type, year: row.folioYear } },
          create: { type: row.type, year: row.folioYear, lastNumber: maxNumber },
          update: { lastNumber: maxNumber },
        });
        console.log(
          `   ✓ FolioSequence ${row.type}/${row.folioYear} re-sincronizado a ${maxNumber}`,
        );
      }
    }

    // Invariante FASE 9 (verificación, no enforcement): cada ConstanciaType
    // debe tener al menos un Signer activo asignado por default.
    const allTypes: ConstanciaType[] = [ConstanciaType.CVD, ConstanciaType.CVP, ConstanciaType.CVE];
    for (const t of allTypes) {
      const count = await prisma.signer.count({
        where: { isActive: true, defaultForTypes: { has: t } },
      });
      if (count === 0) {
        throw new Error(`Invariante violada: tipo ${t} no tiene firmante activo asignado.`);
      }
    }

    // Resumen final — útil para diagnosticar al instante si un dev user
    // quedó inactivo o si el bloque dev no corrió por NODE_ENV.
    const userCount = await prisma.user.count();
    console.log(`\n→ Total users en BD: ${userCount}`);
    const canonical = await prisma.user.findMany({
      where: { username: { in: ["admin", "test_secretary", "test_viewer"] } },
      select: { username: true, role: true, isActive: true },
      orderBy: { username: "asc" },
    });
    console.log("→ Usuarios canónicos:", canonical);

    console.log("\n✅ Seed completado.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌ Seed falló:", err);
  process.exitCode = 1;
});
