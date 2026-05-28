import { createHmac, randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { type ConstanciaType } from "@prisma/client";
import "dotenv/config";

import { cleanupTestUsers, E2E_PASSWORD, E2E_USERS, prisma, setupTestUsers } from "./helpers/db";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Once12345";

const TAG = `list-e2e-${Math.random().toString(36).slice(2, 8)}`;
const SEED_DNI_BASE = "0801-1990";

interface SeedSpec {
  type: ConstanciaType;
  name: string;
  dniLast5: string;
  daysAgo: number;
  status?: "ACTIVE" | "ANNULLED";
}

const SEEDS: SeedSpec[] = [
  { type: "CVD", name: `${TAG} Alfa Pérez`, dniLast5: "11001", daysAgo: 28 },
  { type: "CVP", name: `${TAG} Beta Gómez`, dniLast5: "11002", daysAgo: 24 },
  { type: "CVE", name: `${TAG} Gamma Núñez`, dniLast5: "11003", daysAgo: 20 },
  { type: "CVD", name: `${TAG} Delta Rivas`, dniLast5: "11004", daysAgo: 16 },
  { type: "CVP", name: `${TAG} Épsilon Castro`, dniLast5: "11005", daysAgo: 12 },
  { type: "CVE", name: `${TAG} Zeta Hernández`, dniLast5: "11006", daysAgo: 8, status: "ANNULLED" },
];

const createdIds: string[] = [];

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/usuario o correo/i).fill(username);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe.configure({ mode: "serial" });

test.describe("Listado /constancias", () => {
  test.beforeAll(async () => {
    await setupTestUsers();

    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const signerByType = {
      CVD: await prisma.signer.findFirstOrThrow({
        where: { isActive: true, defaultForTypes: { has: "CVD" } },
      }),
      CVP: await prisma.signer.findFirstOrThrow({
        where: { isActive: true, defaultForTypes: { has: "CVP" } },
      }),
      CVE: await prisma.signer.findFirstOrThrow({
        where: { isActive: true, defaultForTypes: { has: "CVE" } },
      }),
    };

    const now = Date.now();
    for (const [i, s] of SEEDS.entries()) {
      const issuedAt = new Date(now - s.daysAgo * 86400 * 1000);
      const signer = signerByType[s.type];
      const folioNumber = 91000 + Math.floor(Math.random() * 8000) + i;
      const token = createHmac("sha256", "test")
        .update(`${TAG}|${i}|${randomBytes(6).toString("hex")}`)
        .digest("hex");
      const created = await prisma.constancia.create({
        data: {
          type: s.type,
          folioNumber,
          folioYear: issuedAt.getFullYear(),
          folio: `${s.type}-${folioNumber}-${issuedAt.getFullYear()}`,
          status: s.status ?? "ACTIVE",
          applicantFullName: s.name,
          applicantIdNumber: `${SEED_DNI_BASE}-${s.dniLast5}`,
          signerName: signer.fullName,
          signerTitleLine: signer.titleLine,
          signerIdAtIssue: signer.id,
          verificationToken: token,
          issuedAt,
          issuedById: admin.id,
          ...(s.status === "ANNULLED"
            ? {
                annulledAt: new Date(),
                annulledReason: "Test motivo de anulación.",
                annulledById: admin.id,
              }
            : {}),
        },
        select: { id: true },
      });
      createdIds.push(created.id);
    }
  });

  test.afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdIds } } });
      await prisma.constancia.deleteMany({ where: { id: { in: createdIds } } });
    }
    await cleanupTestUsers();
  });

  test("muestra los seeds + resumen de paginación correcto", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=${TAG}`);
    await expect(page.getByTestId("constancia-pagination")).toBeVisible();
    const rows = page.getByTestId("list-row");
    await expect(rows).toHaveCount(SEEDS.length);
    await expect(page.getByTestId("pagination-summary")).toContainText(String(SEEDS.length));
  });

  test("filtro type=CVE + status=ANNULLED reduce a 1 fila", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=${TAG}&type=CVE&status=ANNULLED`);
    const rows = page.getByTestId("list-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Zeta Hernández");
  });

  test("búsqueda por DNI parcial 11003 encuentra Gamma Núñez", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=11003`);
    const rows = page.getByTestId("list-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Gamma Núñez");
  });

  test("URL persiste filtros en deep link", async ({ page, context }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const url = `/constancias?q=${TAG}&type=CVD`;
    const p2 = await context.newPage();
    await p2.goto(url);
    const rows = p2.getByTestId("list-row");
    await expect(rows).toHaveCount(2); // Alfa Pérez y Delta Rivas
    await p2.close();
  });

  test("page=999 redirige a page=1 preservando filtros", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=${TAG}&type=CVD&page=999`);
    // El redirect del Server Component elimina `page` y conserva el resto.
    await expect(page).toHaveURL(new RegExp(`/constancias\\?[^#]*q=${TAG}[^#]*type=CVD`));
    await expect(page).not.toHaveURL(/page=999/);
    await expect(page).not.toHaveURL(/page=2/);
    // La tabla muestra los CVD esperados (Alfa + Delta)
    await expect(page.getByTestId("list-row")).toHaveCount(2);
  });

  test("click en folio navega al detalle", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=${TAG}`);
    const firstFolio = page.getByTestId("list-row").first().locator("a").first();
    await firstFolio.click();
    await expect(page).toHaveURL(/\/constancias\/[a-z0-9]+/);
    await expect(page.getByTestId("constancia-folio")).toBeVisible();
  });

  test("empty state cuando no hay resultados con los filtros", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=ZZZZ_NO_EXISTE_${TAG}`);
    await expect(page.getByTestId("list-empty")).toBeVisible();
    await expect(page.getByTestId("empty-clear")).toBeVisible();
  });

  test("SECRETARY NO ve el filtro 'Emitido por'", async ({ page }) => {
    await login(page, E2E_USERS.secretary.username, E2E_PASSWORD);
    await page.goto(`/constancias?q=${TAG}`);
    await expect(page.getByTestId("filter-q")).toBeVisible();
    await expect(page.getByTestId("filter-issued-by")).toHaveCount(0);
  });

  test("ADMIN SÍ ve el filtro 'Emitido por'", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/constancias?q=${TAG}`);
    await expect(page.getByTestId("filter-issued-by")).toBeVisible();
  });

  test("export CSV: download con content-type y BOM + filtros aplicados", async ({
    page,
    request,
  }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const resp = await request.get(`/api/constancias/export?q=${TAG}&type=CVE`, {
      headers: { cookie: cookieHeader },
    });
    expect(resp.status()).toBe(200);
    expect(resp.headers()["content-type"]).toContain("text/csv");
    expect(resp.headers()["content-disposition"]).toMatch(/attachment; filename="constancias_/);

    const text = await resp.text();
    // BOM UTF-8 al inicio
    expect(text.charCodeAt(0)).toBe(0xfeff);
    // Header presente
    expect(text).toContain("Folio,Tipo,Solicitante,Identidad");
    // Solo CVE (filtro aplicado)
    expect(text).toContain("Gamma Núñez");
    expect(text).toContain("Zeta Hernández");
    expect(text).not.toContain("Alfa Pérez");
  });

  test("AuditLog CONSTANCIA_EXPORTED se registra con rowCount real", async ({ page, request }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const before = await prisma.auditLog.count({ where: { action: "CONSTANCIA_EXPORTED" } });

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const resp = await request.get(`/api/constancias/export?q=${TAG}&type=CVD`, {
      headers: { cookie: cookieHeader },
    });
    // Drenar el body para que el stream se cierre y se registre el audit.
    await resp.text();

    // Esperar a que la escritura asíncrona del audit complete
    let after = before;
    for (let i = 0; i < 20 && after === before; i++) {
      await new Promise((r) => setTimeout(r, 100));
      after = await prisma.auditLog.count({ where: { action: "CONSTANCIA_EXPORTED" } });
    }
    expect(after).toBeGreaterThan(before);

    const log = await prisma.auditLog.findFirst({
      where: { action: "CONSTANCIA_EXPORTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    const meta = log!.metadata as { filters?: Record<string, unknown>; rowCount?: number };
    expect(meta.rowCount).toBe(SEEDS.filter((s) => s.type === "CVD").length);
    expect(meta.filters?.type).toBe("CVD");
  });
});
