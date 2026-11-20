import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

describe("project base", () => {
  it("keeps the source screenshots outside Git tracking", () => {
    const ignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
    expect(ignore.split(/\r?\n/).some(line => line.trim() === "reference/" || line.trim() === "/reference/")).toBe(true);
    expect(execFileSync("git", ["ls-files", "--", "reference/"], { encoding: "utf8" }).trim()).toBe("");
  });
});
