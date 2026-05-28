import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn (class name merger)", () => {
  it("concatenates plain classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("merges conflicting tailwind utilities — last one wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("merges arrays and objects (clsx semantics)", () => {
    expect(cn(["a", { b: true, c: false }, ["d"]])).toBe("a b d");
  });
});
