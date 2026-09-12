/**
 * Controls catalog: every primitives module exports importable components,
 * and no primitive depends on preset-owned feature code (core never imports
 * features, so the library stays available in every preset and in derived
 * projects). Discovery is by glob + real exports, never a fixed list.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

function primitiveFiles(): string[] {
  return readdirSync(DIR)
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
    .sort();
}

describe("controls catalog", () => {
  it("discovers every primitives module by glob (no fixed list)", () => {
    const files = primitiveFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/^[A-Z][A-Za-z0-9]*\.tsx$/);
    }
  });

  it("every primitives module exports at least one importable component", async () => {
    for (const file of primitiveFiles()) {
      const mod = (await import(join(DIR, file))) as Record<string, unknown>;
      const components = Object.entries(mod).filter(
        ([name, value]) => typeof value === "function" && !name.startsWith("_"),
      );
      expect(
        components.map(([name]) => name),
        `${file} must export at least one importable component`,
      ).not.toEqual([]);
    }
  });

  it("no primitive imports from src/features/** (core stays preset-free)", () => {
    const pattern =
      /from\s+["'][^"']*\/features\/|import\(\s*["'][^"']*\/features\//;
    const offenders: string[] = [];
    for (const file of primitiveFiles()) {
      const content = readFileSync(join(DIR, file), "utf8");
      if (pattern.test(content)) {
        offenders.push(file);
      }
    }
    // No exception is currently needed: the whole library is preset-free.
    expect(offenders).toEqual([]);
  });
});
