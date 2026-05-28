// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkExportRateLimit,
  checkVerifyRateLimit,
  InMemoryRateLimiter,
  RATE_LIMIT_CONFIG,
} from "@/server/lib/rate-limit";

describe("InMemoryRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta `limit` intentos y bloquea el siguiente", async () => {
    const rl = new InMemoryRateLimiter(5, 15 * 60 * 1000);
    for (let i = 1; i <= 5; i++) {
      const r = await rl.check("ip:1");
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
    }
    const blocked = await rl.check("ip:1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.count).toBe(6);
  });

  it("cuenta por key — IPs distintas no se afectan", async () => {
    const rl = new InMemoryRateLimiter(2, 60_000);
    expect((await rl.check("a")).allowed).toBe(true);
    expect((await rl.check("a")).allowed).toBe(true);
    // a está al máximo, pero b arranca fresca
    expect((await rl.check("b")).allowed).toBe(true);
    expect((await rl.check("a")).allowed).toBe(false);
  });

  it("la ventana se resetea tras windowMs", async () => {
    const rl = new InMemoryRateLimiter(2, 60_000);
    await rl.check("x");
    await rl.check("x");
    expect((await rl.check("x")).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const after = await rl.check("x");
    expect(after.allowed).toBe(true);
    expect(after.count).toBe(1);
  });

  it("reset() borra el contador antes de la ventana", async () => {
    const rl = new InMemoryRateLimiter(2, 60_000);
    await rl.check("y");
    await rl.check("y");
    await rl.reset("y");
    const r = await rl.check("y");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it("retryAfterMs decrece a medida que pasa el tiempo dentro de la misma ventana", async () => {
    const rl = new InMemoryRateLimiter(5, 10_000);
    const first = await rl.check("z");
    expect(first.retryAfterMs).toBe(10_000);
    vi.advanceTimersByTime(4_000);
    const later = await rl.check("z");
    expect(later.retryAfterMs).toBe(6_000);
  });
});

describe("checkVerifyRateLimit (30/min por IP)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Avanzamos el reloj a un instante fresco para que la ventana global
    // del singleton (compartida entre tests) no contamine.
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite las primeras 30 consultas", async () => {
    const ip = `verify-test-${Math.random().toString(36).slice(2)}`;
    let allowed = 0;
    for (let i = 0; i < RATE_LIMIT_CONFIG.VERIFY_MAX_ATTEMPTS; i++) {
      const r = await checkVerifyRateLimit(ip);
      if (!r.blocked) allowed++;
    }
    expect(allowed).toBe(RATE_LIMIT_CONFIG.VERIFY_MAX_ATTEMPTS);
  });

  it("bloquea la consulta 31 y la 32 con retryAfterMs >0", async () => {
    const ip = `verify-test-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < RATE_LIMIT_CONFIG.VERIFY_MAX_ATTEMPTS; i++) {
      await checkVerifyRateLimit(ip);
    }
    const block1 = await checkVerifyRateLimit(ip);
    const block2 = await checkVerifyRateLimit(ip);
    expect(block1.blocked).toBe(true);
    expect(block2.blocked).toBe(true);
    expect(block1.retryAfterMs).toBeGreaterThan(0);
  });

  it("IPs distintas no comparten contador", async () => {
    const ipA = `verify-test-A-${Math.random().toString(36).slice(2)}`;
    const ipB = `verify-test-B-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < RATE_LIMIT_CONFIG.VERIFY_MAX_ATTEMPTS; i++) {
      await checkVerifyRateLimit(ipA);
    }
    expect((await checkVerifyRateLimit(ipA)).blocked).toBe(true);
    expect((await checkVerifyRateLimit(ipB)).blocked).toBe(false);
  });

  it("tras 60s la ventana se resetea", async () => {
    const ip = `verify-test-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < RATE_LIMIT_CONFIG.VERIFY_MAX_ATTEMPTS; i++) {
      await checkVerifyRateLimit(ip);
    }
    expect((await checkVerifyRateLimit(ip)).blocked).toBe(true);

    vi.advanceTimersByTime(RATE_LIMIT_CONFIG.VERIFY_WINDOW_MS + 1);

    expect((await checkVerifyRateLimit(ip)).blocked).toBe(false);
  });
});

describe("checkExportRateLimit (10/min por usuario)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-02-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite los primeros 10 exports y bloquea el 11", async () => {
    const uid = `export-test-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < RATE_LIMIT_CONFIG.EXPORT_MAX_ATTEMPTS; i++) {
      expect((await checkExportRateLimit(uid)).blocked).toBe(false);
    }
    expect((await checkExportRateLimit(uid)).blocked).toBe(true);
  });

  it("usuarios distintos no comparten contador", async () => {
    const a = `export-A-${Math.random().toString(36).slice(2)}`;
    const b = `export-B-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < RATE_LIMIT_CONFIG.EXPORT_MAX_ATTEMPTS; i++) {
      await checkExportRateLimit(a);
    }
    expect((await checkExportRateLimit(a)).blocked).toBe(true);
    expect((await checkExportRateLimit(b)).blocked).toBe(false);
  });

  it("tras la ventana de 60s se resetea", async () => {
    const uid = `export-test-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < RATE_LIMIT_CONFIG.EXPORT_MAX_ATTEMPTS; i++) {
      await checkExportRateLimit(uid);
    }
    expect((await checkExportRateLimit(uid)).blocked).toBe(true);

    vi.advanceTimersByTime(RATE_LIMIT_CONFIG.EXPORT_WINDOW_MS + 1);

    expect((await checkExportRateLimit(uid)).blocked).toBe(false);
  });
});
