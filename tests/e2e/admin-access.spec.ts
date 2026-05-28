import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { cleanupTestUsers, E2E_PASSWORD, E2E_USERS, setupTestUsers } from "./helpers/db";

const ADMIN_ROUTES = ["/admin/firmantes", "/admin/usuarios", "/admin/tipos", "/admin/auditoria"];

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/usuario o correo/i).fill(identifier);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe.configure({ mode: "serial" });

test.describe("Admin · Control de acceso", () => {
  test.beforeAll(async () => {
    await setupTestUsers();
  });
  test.afterAll(async () => {
    await cleanupTestUsers();
  });

  test("SECRETARY es redirigido fuera de cada /admin/*", async ({ page }) => {
    await login(page, E2E_USERS.secretary.username, E2E_PASSWORD);
    for (const route of ADMIN_ROUTES) {
      await page.goto(route);
      await expect(page).toHaveURL("/");
    }
  });

  test("VIEWER es redirigido fuera de cada /admin/*", async ({ page }) => {
    await login(page, E2E_USERS.viewer.username, E2E_PASSWORD);
    for (const route of ADMIN_ROUTES) {
      await page.goto(route);
      await expect(page).toHaveURL("/");
    }
  });
});
