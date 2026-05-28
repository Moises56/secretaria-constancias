import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { cleanupTestUsers, E2E_PASSWORD, E2E_USERS, setupTestUsers } from "./helpers/db";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Once12345";

async function fillLogin(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/usuario o correo/i).fill(identifier);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
}

test.describe.configure({ mode: "serial" });

test.describe("Autenticación", () => {
  test.beforeAll(async () => {
    await setupTestUsers();
  });

  test.afterAll(async () => {
    await cleanupTestUsers();
  });

  test("acceso sin sesión redirige a /login con callbackUrl", async ({ page }) => {
    const resp = await page.goto("/constancias");
    expect(resp).not.toBeNull();
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fconstancias/);
  });

  test("login exitoso con admin del seed redirige a /", async ({ page }) => {
    await fillLogin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /buenas,/i })).toBeVisible();
    // El nombre del usuario aparece en la sidebar (user menu)
    await expect(page.getByText("Administrador del Sistema")).toBeVisible();
  });

  test("credenciales inválidas → toast genérico, no filtra existencia", async ({ page }) => {
    await fillLogin(page, ADMIN_USERNAME, "wrong-password-xxx");
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("usuario inactivo no entra (mismo error genérico)", async ({ page }) => {
    await fillLogin(page, E2E_USERS.inactive.username, E2E_PASSWORD);
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("SECRETARY no puede entrar a /admin/* — redirige a /", async ({ page }) => {
    await fillLogin(page, E2E_USERS.secretary.username, E2E_PASSWORD);
    await expect(page).toHaveURL("/");
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL("/");
  });

  test("post-login: localStorage VACÍO y cookie httpOnly", async ({ page, context }) => {
    await fillLogin(page, E2E_USERS.viewer.username, E2E_PASSWORD);
    await expect(page).toHaveURL("/");

    const lsLength = await page.evaluate(() => window.localStorage.length);
    expect(lsLength).toBe(0);
    const ssLength = await page.evaluate(() => window.sessionStorage.length);
    expect(ssLength).toBe(0);

    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "auth.session-token");
    expect(session, "auth.session-token debe existir tras login").toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite?.toLowerCase()).toBe("lax");
  });

  test("logout limpia la cookie y vuelve a /login", async ({ page, context }) => {
    await fillLogin(page, E2E_USERS.viewer.username, E2E_PASSWORD);
    // Abre el menú de usuario en la sidebar y elige Cerrar sesión
    await page
      .getByTestId("app-sidebar-desktop")
      .getByRole("button", { name: /menú de/i })
      .click();
    await page.getByTestId("logout-menu-item").click();
    await expect(page).toHaveURL("/login");
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "auth.session-token");
    expect(session).toBeUndefined();
  });
});
