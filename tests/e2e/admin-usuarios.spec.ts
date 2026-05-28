import { hash } from "@node-rs/argon2";
import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { prisma } from "./helpers/db";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Once12345";
const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

const TARGET_USERNAME = "e2e_target_user";
const CREATED_USERNAME = "e2e_created_user";

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/usuario o correo/i).fill(identifier);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL("/");
}

// securityStamp fijado en el pasado para que cualquier bump sea inequívoco
// (evita igualdad por mismo-ms y deja el rol/estado en un punto conocido).
const BASE_STAMP = new Date("2026-01-01T00:00:00.000Z");

/** Crea/restablece un usuario objetivo SECRETARY activo y devuelve su estado. */
async function ensureTargetUser() {
  const passwordHash = await hash("Targ3t!Pass_2026", ARGON2);
  return prisma.user.upsert({
    where: { username: TARGET_USERNAME },
    create: {
      username: TARGET_USERNAME,
      email: "e2e_target@amdc.gob.hn",
      fullName: "Objetivo De Prueba",
      role: "SECRETARY",
      passwordHash,
      isActive: true,
      securityStamp: BASE_STAMP,
    },
    update: { role: "SECRETARY", isActive: true, passwordHash, securityStamp: BASE_STAMP },
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Admin · Usuarios", () => {
  test.beforeAll(async () => {
    await ensureTargetUser();
  });

  test.afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { username: { in: [TARGET_USERNAME, CREATED_USERNAME] } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await prisma.auditLog.deleteMany({
        where: { OR: [{ userId: { in: ids } }, { entityId: { in: ids } }] },
      });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  test("crear con password débil muestra error y no navega", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/usuarios/nuevo");
    await page.getByTestId("user-username").fill(CREATED_USERNAME);
    await page.getByTestId("user-fullName").fill("Usuario Creado Prueba");
    await page.getByTestId("user-email").fill("e2e_created@amdc.gob.hn");
    await page.getByTestId("user-password").fill("weak");
    await page.getByTestId("user-submit").click();

    await expect(page.getByText(/mínimo 12 caracteres/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/usuarios\/nuevo/);
  });

  test("crear usuario válido aparece en la lista", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/usuarios/nuevo");
    await page.getByTestId("user-username").fill(CREATED_USERNAME);
    await page.getByTestId("user-fullName").fill("Usuario Creado Prueba");
    await page.getByTestId("user-email").fill("e2e_created@amdc.gob.hn");
    await page.getByTestId("user-role").selectOption("VIEWER");
    await page.getByTestId("user-password").fill("Abcdef1234!x");
    await page.getByTestId("user-submit").click();

    await expect(page).toHaveURL("/admin/usuarios");
    await expect(page.getByText(CREATED_USERNAME)).toBeVisible();
  });

  test("no permite auto-desactivación (toggle propio deshabilitado)", async ({ page }) => {
    const admin = await prisma.user.findFirstOrThrow({ where: { username: ADMIN_USERNAME } });
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/usuarios");
    await page.getByTestId(`user-actions-${admin.id}`).click();
    await expect(page.getByTestId(`user-toggle-${admin.id}`)).toBeDisabled();
  });

  test("reset de contraseña: modal gateado y bump de securityStamp", async ({ page }) => {
    const target = await ensureTargetUser();
    const before = target.securityStamp.getTime();

    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto("/admin/usuarios");
    await page.getByTestId(`user-actions-${target.id}`).click();
    await page.getByTestId(`user-reset-${target.id}`).click();

    await expect(page.getByTestId("reset-modal")).toBeVisible();
    await page.getByTestId("reset-generate").click();
    await page.getByTestId("reset-submit").click();

    await expect(page.getByTestId("reset-shown")).toBeVisible();
    // Cerrar bloqueado hasta confirmar la copia.
    await expect(page.getByTestId("reset-close")).toBeDisabled();
    await page.getByTestId("reset-copied").click();
    await page.getByTestId("reset-close").click();
    await expect(page.getByTestId("reset-modal")).toBeHidden();

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { securityStamp: true },
    });
    expect(after.securityStamp.getTime()).toBeGreaterThan(before);
  });

  test("cambiar rol bumpea securityStamp", async ({ page }) => {
    const target = await ensureTargetUser();
    const before = target.securityStamp.getTime();

    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto(`/admin/usuarios/${target.id}/editar`);

    const roleSelect = page.getByTestId("user-role");
    // Confirmar que la página cargó con el rol esperado y que el cambio aplicó
    // en el DOM antes de enviar (evita el flake de selectOption sin registrar).
    await expect(roleSelect).toHaveValue("SECRETARY");
    await roleSelect.selectOption("VIEWER");
    await expect(roleSelect).toHaveValue("VIEWER");
    await page.getByTestId("user-submit").click();

    await expect(page).toHaveURL("/admin/usuarios");
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { role: true, securityStamp: true },
    });
    expect(after.role).toBe("VIEWER");
    expect(after.securityStamp.getTime()).toBeGreaterThan(before);
  });
});
