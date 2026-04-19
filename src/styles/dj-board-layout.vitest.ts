import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.resolve(__dirname, "./boards.css"),
  "utf8",
);

function block(selector: string): string {
  const re = new RegExp(
    `\\${selector}\\s*\\{([^}]*)\\}`,
  );
  const m = css.match(re);
  if (!m) throw new Error(`selector ${selector} not found`);
  return m[1];
}

describe("dj-board right column layout (regression for 2026-04-20-dj-board-layout)", () => {
  it(".dj-board right column is variable-width, not fixed 260px", () => {
    const body = block(".dj-board");
    expect(body).toMatch(/grid-template-columns\s*:/);
    expect(body).not.toMatch(/grid-template-columns:[^;]*\b260px\s*;/);
    expect(body).toMatch(/minmax\(\s*260px\s*,\s*340px\s*\)/);
  });

  it(".dj-ranking is not sticky", () => {
    const body = block(".dj-ranking");
    expect(body).not.toMatch(/position\s*:\s*sticky/);
  });
});
