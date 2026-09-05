import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("site motion system", () => {
  const css = readFileSync("src/index.css", "utf8");
  const button = readFileSync("src/components/ui/button.tsx", "utf8");
  const card = readFileSync("src/components/ui/card.tsx", "utf8");

  it("respects reduced motion and defines page-enter", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".page-enter");
    expect(css).toContain(".motion-lift");
    expect(css).toContain(".nav-link-underline");
  });

  it("applies micro-interaction classes to core UI", () => {
    expect(button).toContain("active:scale-[0.98]");
    expect(card).toContain("motion-lift");
  });
});
