import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("project base", () => {
  it("keeps the source screenshots outside Git tracking", () => {
    expect(existsSync(join(process.cwd(), "reference", "metabase"))).toBe(true);
    expect(existsSync(join(process.cwd(), "reference", "ga4"))).toBe(true);
    expect(existsSync(join(process.cwd(), "reference", "clarity"))).toBe(true);
  });
});
