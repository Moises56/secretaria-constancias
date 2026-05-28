import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { prisma } from "./helpers/db";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Once12345";

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/usuario o correo/i).fill(identifier);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe.configure({ mode: "serial" });

test.describe("Admin · Auditoría", () => {
  let testStart: Date;

  test.beforeAll(() => {
    testStart = new Date();
  });

  test.afterAll(async () => {
    // Solo borra los AUDIT_EXPORTED creados por este spec.
    await prisma.auditLog.deleteMany({
      where: { action: "AUDIT_EXPORTED", createdAt: { gte: testStart } },
    });
  });

  test("filtro por acción agrupado funciona", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/auditoria");
    await expect(page.getByTestId("audit-filters")).toBeVisible();

    // El login recién hecho garantiza ≥1 evento LOGIN en el log.
    await page.getByTestId("audit-filter-action").click();
    await page.getByRole("option", { name: "Inicio de sesión" }).click();

    await expect(page).toHaveURL(/action=LOGIN/);
    const rows = page.getByTestId("audit-row");
    await expect(rows.first()).toBeVisible();
    // Toda fila filtrada debe ser LOGIN.
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toHaveAttribute("data-action", "LOGIN");
    }
  });

  test("meta-audit: exportar registra AUDIT_EXPORTED visible al refrescar", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/auditoria");

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("audit-export-csv").click();
    const download = await downloadPromise;
    await download.path(); // espera a que el stream termine

    // El AUDIT_EXPORTED se escribe ANTES de cerrar el stream → ya está en BD.
    await page.goto("/admin/auditoria?action=AUDIT_EXPORTED");
    const firstRow = page.getByTestId("audit-row").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toHaveAttribute("data-action", "AUDIT_EXPORTED");
  });

  test("abrir detalles muestra la metadata en JSON", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/auditoria?action=AUDIT_EXPORTED");
    const firstRow = page.getByTestId("audit-row").first();
    await expect(firstRow).toBeVisible();
    await firstRow.getByRole("button", { name: /ver detalles/i }).click();
    await expect(page.getByTestId("audit-details-modal")).toBeVisible();
    await expect(page.getByTestId("audit-details-metadata")).toContainText("rowCount");
  });
});
