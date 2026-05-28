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

// DNI tag para la constancia que crea este spec (limpieza idempotente).
const SEC_DNI = "0801-1990-99999";
let pdfConstanciaId: string;
let pdfConstanciaToken: string;

test.describe("Seguridad — headers y CSP", () => {
  test.beforeAll(async () => {
    await setupTestUsers();
    // El test de PDF necesita UNA constancia. En un DB fresco (CI) los demás
    // specs limpian las suyas y security corre al final → 0 constancias. Creamos
    // la nuestra (limpiando primero cualquier resto de un run abortado).
    await prisma.constancia.deleteMany({ where: { applicantIdNumber: SEC_DNI } });
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const signer = await prisma.signer.findFirstOrThrow({ where: { isActive: true } });
    const c = await prisma.constancia.create({
      data: {
        type: "CVP",
        folio: "CVP-990001-2026",
        folioNumber: 990001,
        folioYear: 2026,
        applicantFullName: "Prueba Seguridad Pdf",
        applicantIdNumber: SEC_DNI,
        signerName: signer.fullName,
        signerTitleLine: signer.titleLine,
        signerIdAtIssue: signer.id,
        verificationToken: `sec-pdf-${Date.now()}`.padEnd(64, "0"),
        issuedById: admin.id,
      },
      select: { id: true, verificationToken: true },
    });
    pdfConstanciaId = c.id;
    pdfConstanciaToken = c.verificationToken;
  });
  test.afterAll(async () => {
    // El AuditLog no tiene FK a Constancia (entityId es plain string opcional),
    // así que hay que borrar los logs de este test antes (o quedan huérfanos).
    await prisma.auditLog.deleteMany({ where: { entityId: pdfConstanciaId } });
    await prisma.constancia.deleteMany({ where: { applicantIdNumber: SEC_DNI } });
    await cleanupTestUsers();
  });

  test("CSP presente y estricta en página pública", async ({ page }) => {
    const res = await page.goto("/login");
    const csp = res?.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  test("headers de seguridad presentes", async ({ page }) => {
    const res = await page.goto("/login");
    const h = res?.headers() ?? {};
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("geolocation=()");
  });

  test("ninguna página del sistema dispara violaciones de CSP", async ({ page }) => {
    const violations: string[] = [];
    const collect = (text: string) => {
      if (/content security policy|refused to (load|execute|apply|connect)/i.test(text)) {
        violations.push(text);
      }
    };
    page.on("console", (msg) => collect(msg.text()));
    page.on("pageerror", (err) => collect(err.message));

    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const paths = [
      "/",
      "/constancias",
      "/constancias/nueva",
      "/admin/firmantes",
      "/admin/usuarios",
      "/admin/tipos",
      "/admin/auditoria",
    ];
    for (const path of paths) {
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(400);
    }

    // Detalle con QR (data URL → img-src data:).
    const c = await prisma.constancia.findFirst({ orderBy: { issuedAt: "desc" } });
    if (c) {
      await page.goto(`/constancias/${c.id}`, { waitUntil: "load" });
      await page.waitForTimeout(400);
    }

    expect(violations).toEqual([]);
  });

  test("PDF endpoint sirve con CSP aislada y nosniff", async ({ page }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const res = await page.request.get(`/api/constancias/${pdfConstanciaId}/pdf`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("cookie de sesión: httpOnly + SameSite=Lax", async ({ page, context }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name.includes("session-token"));
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    // (Secure solo aparece en HTTPS; en dev http no se evalúa.)
  });

  test("el token de sesión NO está en localStorage (solo cookie httpOnly)", async ({
    page,
    context,
  }) => {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name.includes("session-token"));
    expect(session).toBeDefined();

    // Solo se permite la clave de tema de next-themes; nunca datos de sesión.
    const nonThemeKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k !== "theme"),
    );
    expect(nonThemeKeys).toEqual([]);

    const tokenLeaked = await page.evaluate((val) => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (localStorage.getItem(k) ?? "").includes(val)) return true;
      }
      return false;
    }, session!.value);
    expect(tokenLeaked).toBe(false);
  });

  test("getClientIp lee X-Forwarded-For — AuditLog registra IP del cliente, no del proxy", async ({
    page,
  }) => {
    // El reverse proxy de AMDC inserta la IP real del cliente como primer
    // salto en X-Forwarded-For (formato: "cliente, hop1, hop2"). Verificamos
    // que `getClientIp` la toma — sin esto el AuditLog registraría siempre
    // la IP interna del proxy (192.168.200.x) y el rate-limit por IP sería
    // global a todos los usuarios.
    const SPOOF_IP = "203.0.113.45";
    const res = await page.request.get(`/v/${pdfConstanciaToken}`, {
      headers: { "x-forwarded-for": `${SPOOF_IP}, 192.168.200.5, 10.0.0.1` },
    });
    expect(res.status()).toBe(200);

    const log = await prisma.auditLog.findFirst({
      where: {
        action: "CONSTANCIA_VERIFIED",
        entityId: pdfConstanciaId,
        ipAddress: SPOOF_IP,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(log, `AuditLog debe registrar ${SPOOF_IP} (primer salto de XFF)`).toBeTruthy();
  });

  test("rate limit de exports: bloquea con 429 tras superar la cuota", async ({ page }) => {
    // Usamos un SECRETARY dedicado: el límite es POR USUARIO, así que agotar su
    // cuota no toca la del admin (que otros specs usan para exportar, p.ej. el
    // meta-audit de auditoría). Evita interferencia entre specs / re-runs.
    await login(page, E2E_USERS.secretary.username, E2E_PASSWORD);
    // Cuota = 10/min/usuario. Tras ≥10 intentos, el siguiente devuelve 429.
    let lastStatus = 0;
    for (let i = 0; i < 12; i++) {
      const res = await page.request.get("/api/constancias/export");
      lastStatus = res.status();
    }
    expect(lastStatus).toBe(429);
  });
});
