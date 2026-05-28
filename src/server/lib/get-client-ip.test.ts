import { describe, expect, it } from "vitest";

import { getClientIpFromHeaders } from "./get-client-ip";

function makeHeaders(entries: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(entries)) h.set(k, v);
  return h;
}

describe("getClientIpFromHeaders", () => {
  it("prefiere X-Forwarded-For y devuelve la primera IP de la lista", () => {
    const h = makeHeaders({
      "x-forwarded-for": "203.0.113.45, 192.168.200.5, 10.0.0.1",
      "x-real-ip": "192.168.200.5",
    });
    expect(getClientIpFromHeaders(h)).toBe("203.0.113.45");
  });

  it("trimea espacios alrededor de la primera IP de X-Forwarded-For", () => {
    const h = makeHeaders({ "x-forwarded-for": "  203.0.113.45  , 10.0.0.1" });
    expect(getClientIpFromHeaders(h)).toBe("203.0.113.45");
  });

  it("usa X-Real-IP cuando X-Forwarded-For está ausente", () => {
    const h = makeHeaders({ "x-real-ip": "203.0.113.99" });
    expect(getClientIpFromHeaders(h)).toBe("203.0.113.99");
  });

  it("trimea espacios de X-Real-IP", () => {
    const h = makeHeaders({ "x-real-ip": "  203.0.113.99  " });
    expect(getClientIpFromHeaders(h)).toBe("203.0.113.99");
  });

  it("devuelve 'unknown' cuando ningún header está presente", () => {
    expect(getClientIpFromHeaders(makeHeaders({}))).toBe("unknown");
  });

  it("devuelve 'unknown' si X-Forwarded-For está vacío o solo tiene comas", () => {
    expect(getClientIpFromHeaders(makeHeaders({ "x-forwarded-for": "" }))).toBe("unknown");
    expect(getClientIpFromHeaders(makeHeaders({ "x-forwarded-for": "   ," }))).toBe("unknown");
  });

  it("cae a X-Real-IP cuando X-Forwarded-For sólo trae espacios/comas", () => {
    const h = makeHeaders({
      "x-forwarded-for": "   ,",
      "x-real-ip": "203.0.113.77",
    });
    expect(getClientIpFromHeaders(h)).toBe("203.0.113.77");
  });

  it("una IP IPv6 entre paréntesis-corchetes se preserva tal cual", () => {
    const h = makeHeaders({ "x-forwarded-for": "[2001:db8::1]:51000, 10.0.0.1" });
    expect(getClientIpFromHeaders(h)).toBe("[2001:db8::1]:51000");
  });
});
