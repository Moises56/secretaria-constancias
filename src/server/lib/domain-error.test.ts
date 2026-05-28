// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DomainError } from "@/server/lib/domain-error";

describe("DomainError", () => {
  it("expone message y name, y es instanceof Error", () => {
    const err = new DomainError("No se puede desactivar al último administrador activo.");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DomainError");
    expect(err.message).toBe("No se puede desactivar al último administrador activo.");
  });

  it("el discriminante instanceof distingue DomainError de un Error genérico", () => {
    expect(new DomainError("x") instanceof DomainError).toBe(true);
    expect(new Error("x") instanceof DomainError).toBe(false);
  });
});
