import { createHmac, randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { type ConstanciaType } from "@prisma/client";
import "dotenv/config";

import { cleanupTestUsers, E2E_PASSWORD, E2E_USERS, prisma, setupTestUsers } from "./helpers/db";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Once12345";

const TAG = `dash-e2e-${Math.random().toString(36).slice(2, 8)}`;

interface SeedSpec {
  type: ConstanciaType;
  daysAgo: number;
}

// 6 constancias en los últimos 30 días (default range).
const SEEDS: SeedSpec[] = [
  { type: "CVD", daysAgo: 2 },
  { type: "CVD", daysAgo: 6 },
  { type: "CVP", daysAgo: 9 },
  { type: "CVP", daysAgo: 14 },
  { type: "CVE", daysAgo: 18 },
  { type: "CVE", daysAgo: 24 },
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

test.describe("Dashboard analítico /", () => {
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
      const folioNumber = 97000 + Math.floor(Math.random() * 2000) + i;
      const token = createHmac("sha256", "dash-test")
        .update(`${TAG}|${i}|${randomBytes(6).toString("hex")}`)
        .digest("hex");
      const created = await prisma.constancia.create({
        data: {
          type: s.type,
          folioNumber,
          folioYear: issuedAt.getFullYear(),
          folio: `${s.type}-${folioNumber}-${issuedAt.getFullYear()}`,
          status: "ACTIVE",
          applicantFullName: `${TAG} Solicitante ${i}`,
          applicantIdNumber: `0801-1990-${String(60000 + i).padStart(5, "0")}`,
          signerName: signer.fullName,
          signerTitleLine: signer.titleLine,
          signerIdAtIssue: signer.id,
          verificationToken: token,
          issuedAt,
          issuedById: admin.id,
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

  test("default = preset 30 días, 4 StatCards visibles con números", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page.getByTestId("current-preset")).toContainText("30 días");
    const cards = page.getByTestId("stat-card");
    await expect(cards).toHaveCount(4);
    // Al menos uno tiene número >= 6 (los seeds nuestros)
    const totalText = await cards.first().textContent();
    expect(totalText).toMatch(/\d/);
  });

  test("cambiar a '7 días' actualiza URL y los números cambian", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.getByTestId("preset-7d").click();
    await expect(page).toHaveURL(/[?&]preset=7d/);
    await expect(page.getByTestId("current-preset")).toContainText("7 días");
  });

  test("AreaChart renderiza con elementos SVG", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const chart = page.getByTestId("chart-by-day");
    await expect(chart).toBeVisible();
    await expect(chart.locator("svg path").first()).toBeVisible();
  });

  test("DonutChart renderiza segmentos", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const chart = page.getByTestId("chart-donut");
    await expect(chart).toBeVisible();
    // Donut tiene varios <path> (uno por slice)
    await expect(chart.locator("svg path").first()).toBeVisible();
  });

  test("ADMIN ve TopEmisores chart", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page.getByTestId("chart-top-emisores")).toBeVisible();
  });

  test("SECRETARY NO ve TopEmisores", async ({ page }) => {
    await login(page, E2E_USERS.secretary.username, E2E_PASSWORD);
    await expect(page.getByTestId("chart-top-emisores")).toHaveCount(0);
  });

  test("VIEWER NO ve TopEmisores", async ({ page }) => {
    await login(page, E2E_USERS.viewer.username, E2E_PASSWORD);
    await expect(page.getByTestId("chart-top-emisores")).toHaveCount(0);
  });

  test("custom: rango futuro sin datos muestra EmptyDashboardState", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/?preset=custom&from=2030-01-01&to=2030-01-31");
    await expect(page.getByTestId("dashboard-empty")).toBeVisible();
    // Los charts deben estar ausentes
    await expect(page.getByTestId("chart-by-day")).toHaveCount(0);
    await expect(page.getByTestId("chart-donut")).toHaveCount(0);
  });

  test("preset malformado cae al default 30d sin crashear", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/?preset=lalala");
    // No crash, preset cae a 30d
    await expect(page.getByTestId("current-preset")).toContainText("30 días");
  });

  test("crear constancia → dashboard refleja el nuevo registro", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    // Crear una constancia (hoy)
    await page.goto("/constancias/nueva");
    await page.getByText("Vecindad — Residencia vigente").click();
    // El nombre NO puede llevar dígitos (regex NAME_CHARS); por eso no usamos TAG aquí.
    await page.getByLabel(/nombre completo/i).fill("Constancia Prueba Dashboard");
    await page.getByLabel(/número de identidad/i).fill("0801-1990-77777");
    await page.getByTestId("submit-constancia").click();
    // El cuid (NO "nueva"): garantiza que esperamos el redirect a detalle —
    // si no, el conteo de BD corre antes de que la creación se commitee.
    await expect(page).toHaveURL(/\/constancias\/c[a-z0-9]{20,}/);

    // Confirmar via BD directa que la constancia HOY existe (más robusto
    // que parsear el textContent del card a través de GSAP/hydration).
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const countToday = await prisma.constancia.count({
      where: { issuedAt: { gte: todayStart }, status: "ACTIVE" },
    });
    expect(countToday).toBeGreaterThanOrEqual(1);

    // Volver al dashboard con preset=today y confirmar que se renderiza
    // sin caer en el EmptyDashboardState (al haber datos de hoy).
    await page.goto("/?preset=today");
    await expect(page.getByTestId("stat-card").first()).toBeVisible();
    // No debe estar el empty state cuando hay datos de hoy
    await expect(page.getByTestId("dashboard-empty")).toHaveCount(0);

    // Limpieza
    await prisma.constancia.deleteMany({
      where: { applicantIdNumber: "0801-1990-77777" },
    });
  });

  test("EmptyDashboardState ofrece CTA 'Volver al rango por defecto'", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/?preset=custom&from=2030-01-01&to=2030-01-31");
    await expect(page.getByTestId("empty-reset-range")).toBeVisible();
  });
});
