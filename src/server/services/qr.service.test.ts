// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildVerificationUrl,
  generateQrBuffer,
  generateQrDataUrl,
} from "@/server/services/qr.service";

describe("qr.service", () => {
  it("buildVerificationUrl construye {APP_URL}/v/{token} sin slash duplicado", () => {
    const url = buildVerificationUrl("abc123");
    expect(url).toMatch(/\/v\/abc123$/);
    expect(url).not.toMatch(/\/\/v\//);
  });

  it("generateQrDataUrl devuelve un data URL PNG válido", async () => {
    const d = await generateQrDataUrl("test-token-xyz");
    expect(d.startsWith("data:image/png;base64,")).toBe(true);
    // El payload base64 no es vacío
    expect(d.length).toBeGreaterThan(200);
  });

  it("generateQrBuffer devuelve un PNG con magic bytes \\x89PNG", async () => {
    const buf = await generateQrBuffer("test-token-xyz");
    expect(buf.length).toBeGreaterThan(200);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });
});
