import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { cleanupTestUsers, E2E_PASSWORD, E2E_USERS, setupTestUsers } from "./helpers/db";

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

test.describe("Dashboard shell", () => {
  test.beforeAll(async () => {
    await setupTestUsers();
  });
  test.afterAll(async () => {
    await cleanupTestUsers();
  });

  test("dashboard muestra welcome y stat cards placeholder", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    // Saludo dinámico: "Buenos días" / "Buenas tardes" / "Buenas noches"
    await expect(page.getByRole("heading", { name: /buen[oa]s (días|tardes|noches),/i })).toBeVisible();
    const cards = page.getByTestId("stat-card");
    await expect(cards).toHaveCount(4);
  });

  test("sidebar muestra grupo Administración para ADMIN", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const sidebar = page.getByTestId("app-sidebar-desktop");
    await expect(sidebar.getByText("Administración", { exact: false })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /usuarios/i })).toBeVisible();
  });

  test("sidebar oculta Administración para SECRETARY", async ({ page }) => {
    await login(page, E2E_USERS.secretary.username, E2E_PASSWORD);
    const sidebar = page.getByTestId("app-sidebar-desktop");
    await expect(sidebar.getByText("Administración", { exact: false })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /nueva constancia/i })).toBeVisible();
  });

  test("VIEWER ve Constancias pero no 'Nueva constancia' ni admin", async ({ page }) => {
    await login(page, E2E_USERS.viewer.username, E2E_PASSWORD);
    const sidebar = page.getByTestId("app-sidebar-desktop");
    await expect(sidebar.getByRole("link", { name: /constancias$/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /nueva constancia/i })).toHaveCount(0);
    await expect(sidebar.getByText("Administración", { exact: false })).toHaveCount(0);
  });

  test("theme toggle persiste tras reload", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.getByRole("button", { name: /cambiar tema/i }).click();
    await page.getByRole("menuitem", { name: /oscuro/i }).click();
    await expect(page.locator("html.dark")).toBeVisible();
    await page.reload();
    await expect(page.locator("html.dark")).toBeVisible();
  });

  test("mobile drawer: hamburger abre, click en backdrop cierra", async ({ page, viewport }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const drawer = page.getByTestId("app-sidebar-drawer");
    await expect(drawer).toBeHidden();
    await page.getByTestId("header-hamburger").click();
    await expect(drawer).toBeVisible();
    // Click fuera del popup cierra (Esc también funciona, validamos Esc)
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    // Restore viewport
    if (viewport) await page.setViewportSize(viewport);
  });

  test("skip-to-content link existe y apunta a #main-content", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const skip = page.getByRole("link", { name: /saltar al contenido/i });
    await expect(skip).toHaveAttribute("href", "#main-content");
    await expect(page.locator("#main-content")).toBeVisible();
  });
});
