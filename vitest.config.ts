import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` lanza al cargar fuera del bundle de Server Components.
      // En vitest lo neutralizamos para poder importar módulos del server.
      "server-only": path.resolve(__dirname, "./tests/__stubs__/server-only.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Solo medimos las capas UNIT-testeables. Componentes React, pages,
      // route handlers, Server Actions y el wiring de Auth.js se prueban vía
      // E2E (Playwright), NO con mocks pesados de Prisma/Auth (ver docs/TESTING.md).
      include: ["src/server/**", "src/lib/**"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "src/server/actions/**", // Server Actions → cubiertos por E2E
        "src/server/auth/config.ts", // authorize() de Auth.js → E2E
        "src/server/auth/require.ts", // requireAuth/requirePermission → E2E
        "src/server/auth/index.ts", // wiring de NextAuth()
        "src/server/lib/logger.ts", // wrapper de pino (config, sin lógica)
        "src/lib/chart-tokens.ts", // constantes de color (sin lógica)
        "src/lib/utils/use-reduced-motion.ts", // hook client → E2E
      ],
      // Thresholds AGREGADOS por capa (no perFile: evita tests cosméticos en
      // archivos triviales). El objetivo de FASE 11 es ≥70% en src/server.
      thresholds: {
        "src/server/**": { lines: 70, functions: 70, statements: 70, branches: 65 },
        "src/lib/**": { lines: 70, functions: 70, statements: 70, branches: 65 },
      },
    },
  },
});
