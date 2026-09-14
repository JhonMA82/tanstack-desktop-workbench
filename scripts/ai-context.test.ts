/**
 * AI context tests: the snapshot is built from the real repo state,
 * generation is deterministic, and --check detects drift.
 */
import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readText, writeFile } from "./_lib/files";
import { buildAiContext } from "./generate-ai-context";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const OUTPUT = join(REPO_ROOT, "docs", "ai", "generated-context.md");

/**
 * Remove orphaned scaffold-test-probe* dirs left by a crashed scaffolding
 * run. bun test runs files sequentially, so no live probe can exist while
 * this file's tests run; anything matching is stale cross-test residue
 * that would otherwise pollute the filesystem snapshot below.
 */
function sweepStrayProbeDirs(): void {
  const featuresDir = join(REPO_ROOT, "src", "features");
  let entries: string[];
  try {
    entries = readdirSync(featuresDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith("scaffold-test-probe")) {
      rmSync(join(featuresDir, entry), { recursive: true, force: true });
    }
  }
}

describe("ai:context snapshot", () => {
  it("describes the real repo state, not a manual list", async () => {
    const { snapshot, digest } = await buildAiContext(REPO_ROOT);
    expect(snapshot.packageName).toBe("tanstack-workbench");
    expect(snapshot.preset).toBe("technical-ribbon");
    expect(snapshot.theme).toBe("ocstudio");
    expect(snapshot.presetIds).toEqual([
      "forms",
      "ide",
      "minimal",
      "monitoring",
      "operator",
      "records",
      "settings",
      "setup",
      "studio",
      "technical-ribbon",
    ]);
    expect(snapshot.themes).toEqual(["ocstudio", "light"]);
    expect(snapshot.resolvedFeatures).toContain("viewport");
    expect(snapshot.widgets).toContain("properties");
    expect(snapshot.commands).toContain("view.reset");
    expect(snapshot.tools).toContain("select");
    expect(snapshot.statusItems).toContain("grid");
    expect(snapshot.relevantScripts).toContain("ai:context");
    expect(digest).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic across builds", async () => {
    const first = await buildAiContext(REPO_ROOT);
    const second = await buildAiContext(REPO_ROOT);
    expect(second.content).toBe(first.content);
    expect(second.digest).toBe(first.digest);
  });

  it("marks the output as generated", async () => {
    const { content, digest } = await buildAiContext(REPO_ROOT);
    expect(content).toContain("Generated file — do not edit manually.");
    expect(content).toContain(`digest: ${digest}`);
  });
});

describe("ai:context preset patterns", () => {
  it("covers every preset present with composition and edit pointers", async () => {
    const { snapshot } = await buildAiContext(REPO_ROOT);
    expect(snapshot.presetPatterns.map((pattern) => pattern.id)).toEqual(
      snapshot.presetIds,
    );
    expect(snapshot.presetPatterns.map((pattern) => pattern.id)).toEqual([
      "forms",
      "ide",
      "minimal",
      "monitoring",
      "operator",
      "records",
      "settings",
      "setup",
      "studio",
      "technical-ribbon",
    ]);
    for (const pattern of snapshot.presetPatterns) {
      expect(pattern.dir).toMatch(/^src\/features\//);
      expect(
        Object.values(pattern.slots)
          .flat()
          .filter((slot) => slot.length > 0).length,
      ).toBeGreaterThan(0);
      expect(pattern.defaultFeatures.length).toBeGreaterThan(0);
    }
  });

  it("derives the technical-ribbon tree from real exports", async () => {
    const { snapshot } = await buildAiContext(REPO_ROOT);
    const ribbon = snapshot.presetPatterns.find(
      (pattern) => pattern.id === "technical-ribbon",
    );
    expect(ribbon?.ribbonFile).toBe("technicalRibbonRibbon.ts");
    expect(ribbon?.ribbonTabs?.map((tab) => tab.id)).toEqual([
      "home",
      "annotate",
      "view",
      "manage",
    ]);
    expect(ribbon?.railTools).toContain("select");
    expect(ribbon?.toolDefCount ?? 0).toBeGreaterThan(0);
    expect(ribbon?.toolPartFiles).toEqual([
      "annotateTools",
      "homeTools",
      "manageTools",
      "viewTools",
    ]);
    expect(
      ribbon?.widgets?.find((widget) => widget.id === "properties"),
    ).toMatchObject({ dock: "right", visible: true });
    expect(ribbon?.statusIds).toEqual(["grid", "ortho", "osnap"]);
    expect(ribbon?.commandIds).toContain("draw.line");
    expect(ribbon?.shellFiles).toContain("TechnicalRibbonPage.tsx");
  });

  it("describes ribbon-less presets via slots and shell pointers", async () => {
    const { snapshot } = await buildAiContext(REPO_ROOT);
    const minimal = snapshot.presetPatterns.find(
      (pattern) => pattern.id === "minimal",
    );
    expect(minimal?.ribbonFile).toBeUndefined();
    expect(minimal?.slots.center).toContain("viewport");
    expect(minimal?.shellFiles).toContain("MinimalWorkbench.tsx");
  });

  it("describes viewport-free presets via form/table slots", async () => {
    const { snapshot } = await buildAiContext(REPO_ROOT);
    const forms = snapshot.presetPatterns.find(
      (pattern) => pattern.id === "forms",
    );
    expect(forms?.slots.center).toContain("form");
    expect(forms?.defaultFeatures).toContain("form");
    expect(forms?.shellFiles).toContain("FormsWorkbench.tsx");
    const records = snapshot.presetPatterns.find(
      (pattern) => pattern.id === "records",
    );
    expect(records?.slots.center).toContain("data-table");
    expect(records?.defaultFeatures).toContain("detail");
    expect(records?.shellFiles).toContain("RecordsWorkbench.tsx");
    const settings = snapshot.presetPatterns.find(
      (pattern) => pattern.id === "settings",
    );
    expect(settings?.slots.center).toContain("form");
    expect(settings?.shellFiles).toContain("SettingsWorkbench.tsx");
    for (const pattern of [forms, records, settings]) {
      expect(Object.values(pattern?.slots ?? {}).flat()).not.toContain(
        "viewport",
      );
    }
  });

  it("points only at files that exist on disk", async () => {
    const { snapshot } = await buildAiContext(REPO_ROOT);
    for (const pattern of snapshot.presetPatterns) {
      const candidates = [
        pattern.presetFile,
        pattern.ribbonFile,
        pattern.toolsFile,
        pattern.widgetsFile,
        pattern.statusFile,
        pattern.commandsFile,
        ...(pattern.shellFiles ?? []),
      ];
      for (const file of candidates) {
        if (file) {
          expect(existsSync(join(REPO_ROOT, pattern.dir, file))).toBe(true);
        }
      }
      if (pattern.toolsDir) {
        expect(existsSync(join(REPO_ROOT, pattern.dir, pattern.toolsDir))).toBe(
          true,
        );
      }
    }
  });

  it("renders one subsection per preset present in the markdown", async () => {
    const { content, snapshot } = await buildAiContext(REPO_ROOT);
    for (const pattern of snapshot.presetPatterns) {
      expect(content).toContain(`### \`${pattern.id}\``);
      expect(content).toContain(pattern.presetFile);
    }
  });
});

describe("ai:context controls library", () => {
  it("invents nothing: one entry per real component export in primitives/", async () => {
    const { snapshot } = await buildAiContext(REPO_ROOT);
    const dir = join(REPO_ROOT, "src", "components", "workbench", "primitives");
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
      .sort();
    expect(files.length).toBeGreaterThan(0);
    // Every globbed module contributes at least one catalog entry.
    for (const file of files) {
      expect(
        snapshot.controls.filter((control) => control.file === file).length,
        `${file} must contribute at least one control`,
      ).toBeGreaterThan(0);
    }
    // No entry points at a file outside the glob.
    expect(
      [...new Set(snapshot.controls.map((control) => control.file))].sort(),
    ).toEqual(files);
  });

  it("groups by family with a one-line purpose per control", async () => {
    const { snapshot, content } = await buildAiContext(REPO_ROOT);
    expect(snapshot.controls.length).toBeGreaterThan(0);
    for (const control of snapshot.controls) {
      expect([
        "forms",
        "tables",
        "overlays",
        "feedback",
        "layout",
        "other",
      ]).toContain(control.family);
      expect(control.name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
      expect(control.purpose.length).toBeGreaterThan(0);
      expect(
        existsSync(
          join(
            REPO_ROOT,
            "src",
            "components",
            "workbench",
            "primitives",
            control.file,
          ),
        ),
      ).toBe(true);
      expect(content).toContain(`\`${control.name}\` (\`${control.file}\`)`);
    }
    // Spot-check the canonical families with real exports.
    const byName = new Map(
      snapshot.controls.map((control) => [control.name, control]),
    );
    expect(byName.get("FormField")?.family).toBe("forms");
    expect(byName.get("DataTable")?.family).toBe("tables");
    expect(byName.get("Dialog")?.family).toBe("overlays");
    expect(byName.get("Badge")?.family).toBe("feedback");
    expect(byName.get("Panel")?.family).toBe("layout");
    expect(content).toContain("## Controls library");
  });
});

describe("ai:context:check", () => {
  it("passes when the file matches the regenerated snapshot", async () => {
    // Deterministic: start from a clean tree, run --check against
    // just-regenerated content, then assert the committed file was
    // already fresh. Never assume ambient file state left by other tests.
    sweepStrayProbeDirs();
    const original = readText(OUTPUT);
    try {
      const { content } = await buildAiContext(REPO_ROOT);
      writeFile(OUTPUT, content, { force: true });
      const out = execSync(
        `bun ${join(SCRIPTS_DIR, "generate-ai-context.ts")} --check`,
        {
          cwd: REPO_ROOT,
          encoding: "utf8",
        },
      );
      expect(out).toContain("is fresh");
      expect(original).toBe(content);
    } finally {
      writeFile(OUTPUT, original, { force: true });
    }
  });

  it("fails with the stale message when the file drifts", () => {
    const original = readText(OUTPUT);
    try {
      writeFile(OUTPUT, `${original}\n<!-- drift -->\n`, { force: true });
      expect(() =>
        execSync(`bun ${join(SCRIPTS_DIR, "generate-ai-context.ts")} --check`, {
          cwd: REPO_ROOT,
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).toThrow();
    } finally {
      writeFile(OUTPUT, original, { force: true });
    }
  });
});
