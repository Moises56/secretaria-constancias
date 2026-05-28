import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Sincroniza FolioSequence con los constancias existentes antes de la suite
  // (el DB de dev drifta y rompe la creación de constancias). Idempotente.
  globalSetup: "./tests/e2e/global-setup.ts",
  // Los specs comparten usuarios E2E (setupTestUsers/cleanupTestUsers). Si
  // dos files corren en paralelo el cleanup de uno borra los usuarios del
  // otro a mitad de test. Forzamos ejecución secuencial entre archivos.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "es-HN",
    timezoneId: "America/Tegucigalpa",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // CI usa pnpm start (build pre-compilado) — evita el JIT cold-compile de
    // Turbopack en el primer hit a rutas como /api/audit/export o /login que
    // hacía timeout a tests de E2E. Local sigue con pnpm dev para HMR.
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
