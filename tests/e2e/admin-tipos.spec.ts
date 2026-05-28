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

test.describe("Admin · Tipos", () => {
  test.afterAll(async () => {
    // Red de seguridad: reactiva cualquier firmante de CVE que un test desactivó.
    await prisma.signer.updateMany({
      where: { defaultForTypes: { has: "CVE" } },
      data: { isActive: true },
    });
  });

  test("muestra 3 tipos read-only sin acción de agregar", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/tipos");

    await expect(page.getByTestId("tipo-card-CVD")).toBeVisible();
    await expect(page.getByTestId("tipo-card-CVP")).toBeVisible();
    await expect(page.getByTestId("tipo-card-CVE")).toBeVisible();
    await expect(page.getByRole("button", { name: /agregar|nuevo tipo/i })).toHaveCount(0);
  });

  test("tipo sin firmante activo muestra warning de estado inconsistente", async ({ page }) => {
    // Fuerza el estado inconsistente directamente en BD (saltando la invariante).
    await prisma.signer.updateMany({
      where: { defaultForTypes: { has: "CVE" } },
      data: { isActive: false },
    });

    try {
      await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      await page.goto("/admin/tipos");
      await expect(page.getByTestId("tipo-warning-CVE")).toBeVisible();
    } finally {
      await prisma.signer.updateMany({
        where: { defaultForTypes: { has: "CVE" } },
        data: { isActive: true },
      });
    }
  });
});
