import { expect, test, type Page } from "@playwright/test";
import "dotenv/config";

import { cleanupTestUsers, E2E_PASSWORD, E2E_USERS, prisma, setupTestUsers } from "./helpers/db";

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

test.describe("Flujo de constancias", () => {
  test.beforeAll(async () => {
    await setupTestUsers();
  });
  test.afterAll(async () => {
    // Limpia constancias creadas por estos tests (las E2E generan datos de prueba).
    await prisma.constancia.deleteMany({
      where: { applicantIdNumber: { in: ["0801-1997-11539", "0801-1942-02078"] } },
    });
    await cleanupTestUsers();
  });

  test("VIEWER no ve 'Nueva constancia' en el dashboard", async ({ page }) => {
    await login(page, E2E_USERS.viewer.username, E2E_PASSWORD);
    const sidebar = page.getByTestId("app-sidebar-desktop");
    await expect(sidebar.getByRole("link", { name: /nueva constancia/i })).toHaveCount(0);
    // Acceso directo a la URL → la layout que pide CONSTANCIA_CREATE redirige
    await page.goto("/constancias/nueva");
    // VIEWER no tiene permiso, requirePermission lanza; en este nivel
    // Next renderiza el error boundary o redirige según el flujo. Aceptamos
    // cualquier resultado que NO sea el form renderizado.
    await expect(page.getByRole("heading", { name: /nueva constancia de vecindad/i })).toHaveCount(
      0,
    );
  });

  test("ADMIN crea una constancia CVE: preview muestra cláusula intl, submit redirige a detalle", async ({
    page,
  }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page
      .getByRole("link", { name: /nueva constancia/i })
      .first()
      .click();
    await expect(page).toHaveURL("/constancias/nueva");

    // Selecciona CVE
    await page.getByText("Vecindad — Uso en el extranjero").click();

    await page.getByLabel(/nombre completo/i).fill("Ángela Judith García Nolasco");
    await page.getByLabel(/número de identidad/i).fill("0801-1997-11539");

    // El preview debe contener la cláusula internacional
    const preview = page.getByTestId("constancia-preview");
    await expect(preview).toContainText("República de Honduras, Centroamérica");
    await expect(preview).toContainText("ÁNGELA JUDITH GARCÍA NOLASCO");

    // Esperar a que el botón esté realmente clickeable
    const submit = page.getByTestId("submit-constancia");
    await submit.waitFor({ state: "visible" });
    await expect(submit).toBeEnabled();
    await submit.click();

    // El regex matchea el cuid de la constancia (NO 'nueva'). Espera hasta
    // 15s porque el redirect incluye `?new=1` y la detail page hace queries.
    await expect(page).toHaveURL(/\/constancias\/c[a-z0-9]{20,}(\?.*)?$/, { timeout: 15_000 });

    // En la página de detalle vemos folio y status ACTIVA
    await expect(page.getByTestId("constancia-folio")).toBeVisible();
    await expect(page.getByTestId("status-badge")).toHaveText("ACTIVA");
  });

  test("descarga PDF retorna content-type application/pdf", async ({ page, request }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    // Encontramos una constancia existente (la creada en el test previo o cualquiera)
    const constancia = await prisma.constancia.findFirstOrThrow({
      orderBy: { issuedAt: "desc" },
    });

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const resp = await request.get(`/api/constancias/${constancia.id}/pdf`, {
      headers: { cookie: cookieHeader },
    });
    expect(resp.status()).toBe(200);
    expect(resp.headers()["content-type"]).toContain("application/pdf");
    const body = await resp.body();
    expect(body[0]).toBe(0x25); // %
    expect(body[1]).toBe(0x50); // P
    expect(body[2]).toBe(0x44); // D
    expect(body[3]).toBe(0x46); // F
  });

  test("ADMIN anula la constancia: motivo válido → banner ANULADA aparece", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const constancia = await prisma.constancia.findFirstOrThrow({
      where: { applicantIdNumber: "0801-1997-11539", status: "ACTIVE" },
      orderBy: { issuedAt: "desc" },
    });

    await page.goto(`/constancias/${constancia.id}`);
    await page.getByTestId("open-annul-modal").click();
    await page.getByTestId("annul-reason").fill("Datos incorrectos en el DNI del solicitante");
    await page.getByTestId("confirm-annul").click();

    await expect(page.getByTestId("annul-banner")).toBeVisible();
    await expect(page.getByTestId("status-badge")).toHaveText("ANULADA");
  });

  test("motivo de anulación corto se rechaza", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    // Creamos una constancia limpia para anular intencionalmente con motivo corto
    await page.goto("/constancias/nueva");
    await page.getByText("Vecindad — Residencia pasada").click();
    await page.getByLabel(/nombre completo/i).fill("Héctor Miguel Zelaya González");
    await page.getByLabel(/número de identidad/i).fill("0801-1942-02078");
    await page.getByTestId("submit-constancia").click();
    await expect(page).toHaveURL(/\/constancias\/[a-z0-9]+/);

    await page.getByTestId("open-annul-modal").click();
    await page.getByTestId("annul-reason").fill("corto"); // <10
    // El botón debe estar deshabilitado por la longitud
    await expect(page.getByTestId("confirm-annul")).toBeDisabled();
  });
});
