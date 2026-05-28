import { createHmac, randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";
import { ConstanciaType } from "@prisma/client";
import "dotenv/config";

import { cleanupTestUsers, prisma, setupTestUsers } from "./helpers/db";

const TEST_DNI = "0801-1993-44321";
const TEST_NAME = "María Verificación Pública";

/** Crea una constancia ACTIVE directamente con Prisma, retornando su token. */
async function createTestConstancia(opts: {
  type?: ConstanciaType;
  status?: "ACTIVE" | "ANNULLED";
  annulledReason?: string;
}) {
  const type = opts.type ?? ConstanciaType.CVP;
  // Necesitamos un User para issuedById — usamos el admin del seed.
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const signer = await prisma.signer.findFirstOrThrow({
    where: { isActive: true, defaultForTypes: { has: type } },
  });

  // Reservamos un folio único: número alto que no choque con secuencia normal.
  const year = new Date().getFullYear();
  const folioNumber = 90000 + Math.floor(Math.random() * 9999);

  // Token HMAC similar al de prod.
  const secret = process.env.VERIFICATION_HMAC_SECRET ?? "test-secret";
  const payload = `${type}-${folioNumber}-${year}|${Date.now()}|${randomBytes(8).toString("hex")}`;
  const verificationToken = createHmac("sha256", secret).update(payload).digest("hex");

  return prisma.constancia.create({
    data: {
      type,
      folioNumber,
      folioYear: year,
      folio: `${type}-${folioNumber}-${year}`,
      status: opts.status ?? "ACTIVE",
      applicantFullName: TEST_NAME,
      applicantIdNumber: TEST_DNI,
      signerName: signer.fullName,
      signerTitleLine: signer.titleLine,
      signerIdAtIssue: signer.id,
      verificationToken,
      issuedById: admin.id,
      annulledAt: opts.status === "ANNULLED" ? new Date() : null,
      annulledReason: opts.annulledReason ?? null,
      annulledById: opts.status === "ANNULLED" ? admin.id : null,
    },
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Verificación pública /v/[token]", () => {
  let activeToken: string;
  let annulledToken: string;
  let activeConstanciaId: string;
  let annulledConstanciaId: string;

  test.beforeAll(async () => {
    await setupTestUsers();
    const active = await createTestConstancia({ type: ConstanciaType.CVE });
    const annulled = await createTestConstancia({
      type: ConstanciaType.CVD,
      status: "ANNULLED",
      annulledReason: "Datos del solicitante registrados incorrectamente.",
    });
    activeToken = active.verificationToken;
    annulledToken = annulled.verificationToken;
    activeConstanciaId = active.id;
    annulledConstanciaId = annulled.id;
  });

  test.afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [activeConstanciaId, annulledConstanciaId] } },
    });
    await prisma.constancia.deleteMany({
      where: { id: { in: [activeConstanciaId, annulledConstanciaId] } },
    });
    await cleanupTestUsers();
  });

  test("ACTIVE muestra AUTÉNTICA y DNI enmascarado (XXX en últimos)", async ({ page }) => {
    await page.goto(`/v/${activeToken}`);
    await expect(page.getByTestId("status-active")).toBeVisible();
    await expect(page.getByText("Constancia auténtica")).toBeVisible();
    // DNI enmascarado correcto
    await expect(page.getByTestId("masked-dni")).toHaveText("0801-1993-XXX21");
    // El DNI completo NO debe aparecer en ningún lado de la página
    await expect(page.locator("body")).not.toContainText("0801-1993-44321");
  });

  test("ANNULLED muestra estado anulada + motivo", async ({ page }) => {
    await page.goto(`/v/${annulledToken}`);
    await expect(page.getByTestId("status-annulled")).toBeVisible();
    await expect(page.getByText("Constancia anulada")).toBeVisible();
    await expect(page.getByTestId("annul-reason")).toContainText(
      /datos del solicitante registrados incorrectamente/i,
    );
  });

  test("Token inexistente muestra 'Constancia no encontrada'", async ({ page }) => {
    await page.goto(`/v/${"0".repeat(63)}f`);
    await expect(page.getByTestId("status-notfound")).toBeVisible();
    await expect(page.getByText("Constancia no encontrada")).toBeVisible();
  });

  test("Acceso sin sesión carga correctamente (contexto limpio)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/v/${activeToken}`);
    await expect(p.getByTestId("status-active")).toBeVisible();
    // No hay cookie de auth en este contexto
    const cookies = await ctx.cookies();
    expect(cookies.find((c) => c.name.includes("session-token"))).toBeUndefined();
    await ctx.close();
  });

  test("Meta robots noindex + headers de seguridad presentes", async ({ page }) => {
    const response = await page.goto(`/v/${activeToken}`);
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots?.toLowerCase()).toContain("noindex");

    const headers = response?.headers() ?? {};
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("Auditoría: se registra CONSTANCIA_VERIFIED con tokenPrefix (no token completo)", async ({
    page,
  }) => {
    // Limpiar entradas previas para esta constancia para tener un baseline claro
    await prisma.auditLog.deleteMany({
      where: { entityId: activeConstanciaId, action: "CONSTANCIA_VERIFIED" },
    });
    await page.goto(`/v/${activeToken}`);
    await expect(page.getByTestId("status-active")).toBeVisible();

    const log = await prisma.auditLog.findFirst({
      where: { entityId: activeConstanciaId, action: "CONSTANCIA_VERIFIED" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    const metadata = log!.metadata as { tokenPrefix?: string; result?: string };
    expect(metadata.result).toBe("FOUND_ACTIVE");
    expect(metadata.tokenPrefix).toHaveLength(8);
    expect(metadata.tokenPrefix).toBe(activeToken.slice(0, 8));
    // El token completo NO debe estar en metadata
    expect(JSON.stringify(log!.metadata)).not.toContain(activeToken);
  });
});
