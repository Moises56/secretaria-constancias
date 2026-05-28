// Carga .env ANTES de que cualquier módulo de la app lea process.env (env.ts).
import "dotenv/config";

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
