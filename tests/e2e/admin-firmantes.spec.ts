import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { prisma } from "./helpers/db";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Once12345";

// Sin dígitos: el regex de nombre no los permite.
const CREATED_SIGNER = "Firmante De Prueba Temporal";

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/usuario o correo/i).fill(identifier);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe.configure({ mode: "serial" });

test.describe("Admin · Firmantes", () => {
  test.afterAll(async () => {
    const created = await prisma.signer.findMany({
      where: { fullName: CREATED_SIGNER },
      select: { id: true },
    });
    const ids = created.map((s) => s.id);
    if (ids.length) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
      await prisma.signer.deleteMany({ where: { id: { in: ids } } });
    }
  });

  test("muestra banner inmutable y la lista de firmantes", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/firmantes");
    await expect(page.getByTestId("signer-immutable-banner")).toBeVisible();
    await expect(page.getByTestId("signer-row").first()).toBeVisible();
  });

  test("crea un firmante y aparece en la lista", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/firmantes/nuevo");
    await page.getByTestId("signer-fullName").fill(CREATED_SIGNER);
    await page.getByTestId("signer-titleLine").fill("Cargo de Prueba N.999");
    await page.getByTestId("signer-type-CVE").click();
    await page.getByTestId("signer-submit").click();

    await expect(page).toHaveURL("/admin/firmantes");
    await expect(page.getByText(CREATED_SIGNER)).toBeVisible();
  });

  test("invariante: desactivar al único firmante de un tipo se bloquea", async ({ page }) => {
    // En el seed, el firmante de CVD/CVP es el único activo para ambos tipos.
    const sole = await prisma.signer.findFirstOrThrow({
      where: { isActive: true, defaultForTypes: { has: "CVD" } },
    });
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/admin/firmantes/${sole.id}/editar`);

    // Desmarcar "Firmante activo" y guardar → debe rechazarse. Confirmamos que
    // el checkbox realmente cambió antes de enviar (evita el flake de que el
    // click no registre bajo carga).
    const activeToggle = page.getByTestId("signer-isActive");
    await expect(activeToggle).toBeChecked();
    await activeToggle.click();
    await expect(activeToggle).not.toBeChecked();
    await page.getByTestId("signer-submit").click();

    await expect(page.getByText(/quedar[ií]a sin firmante activo/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/admin/firmantes/${sole.id}/editar`));
  });
});
