import { describe, expect, it } from "bun:test";

/**
 * Theme token parity: every theme file must define the same --wb-*
 * custom property set. A new token added to one theme but not the
 * other fails here. Files are parsed as text (regex only, no CSS
 * parser dependency).
 */
const themeFiles = ["ocstudio.css", "light.css"] as const;

function themeUrl(file: string): URL {
  return new URL(`./${file}`, import.meta.url);
}

function extractTokens(css: string): Set<string> {
  return new Set(css.match(/--wb-[a-z0-9-]+/g) ?? []);
}

describe("theme token parity", () => {
  it("declares its own data-theme selector in every theme file", async () => {
    for (const file of themeFiles) {
      const css = await Bun.file(themeUrl(file)).text();
      const id = file.replace(/\.css$/, "");
      expect(css).toContain(`[data-theme="${id}"]`);
    }
  });

  it("defines the same --wb-* token set in every theme", async () => {
    const sets = new Map<string, Set<string>>();
    for (const file of themeFiles) {
      const css = await Bun.file(themeUrl(file)).text();
      const tokens = extractTokens(css);
      expect(tokens.size).toBeGreaterThan(0);
      sets.set(file, tokens);
    }
    const [firstFile, firstTokens] = [...sets.entries()][0];
    for (const [file, tokens] of sets.entries()) {
      if (file === firstFile) {
        continue;
      }
      const missing = [...firstTokens].filter((token) => !tokens.has(token));
      const extra = [...tokens].filter((token) => !firstTokens.has(token));
      expect({ file, missing, extra }).toEqual({
        file,
        missing: [],
        extra: [],
      });
    }
  });

  it("covers every token declared in tokens.css", async () => {
    const tokensCss = await Bun.file(
      new URL("../tokens.css", import.meta.url),
    ).text();
    const expected = extractTokens(tokensCss);
    expect(expected.size).toBeGreaterThan(0);
    for (const file of themeFiles) {
      const css = await Bun.file(themeUrl(file)).text();
      const actual = extractTokens(css);
      const missing = [...expected].filter((token) => !actual.has(token));
      expect({ file, missing }).toEqual({ file, missing: [] });
    }
  });
});
