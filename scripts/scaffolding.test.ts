/**
 * Scaffolder self-test: unit tests for the _lib helpers plus an integration
 * test that materializes a real project into a temp dir and checks the
 * source-only/derived contract, the provenance marker, and the generated
 * manifest. Temp fixtures are always removed.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { list, parseArgs, str } from "./_lib/cli";
import { ensureDir, exists, listFilesRecursive } from "./_lib/files";
import {
  normalizeExtensionId,
  toCamel,
  toKebab,
  toPascal,
  toTitle,
} from "./_lib/naming";
import { renderTemplate, renderTree } from "./_lib/templates";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const AI_CONTEXT_FILE = join(REPO_ROOT, "docs", "ai", "generated-context.md");
const tempDirs: string[] = [];
const repoProbeDirs: string[] = [];

/**
 * Remove orphaned scaffold-test-probe* dirs inside the source tree.
 * bun test runs files sequentially in one process, so any such dir found
 * outside the owning test is a leftover from a crashed run, never live state.
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

beforeAll(() => {
  sweepStrayProbeDirs();
});

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const dir of repoProbeDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  sweepStrayProbeDirs();
});

function makeTemp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runScript(script: string, args: string, cwd = REPO_ROOT): string {
  return execSync(`bun ${join(SCRIPTS_DIR, script)} ${args}`, {
    cwd,
    encoding: "utf8",
  });
}

describe("naming", () => {
  it("converts between cases", () => {
    expect(toKebab("MachineControl")).toBe("machine-control");
    expect(toPascal("machine-control")).toBe("MachineControl");
    expect(toCamel("machine-control")).toBe("machineControl");
    expect(toTitle("machine-control")).toBe("Machine Control");
  });

  it("normalizes and rejects extension ids", () => {
    expect(normalizeExtensionId("MachineControl", "feature")).toBe(
      "machine-control",
    );
    expect(() => normalizeExtensionId("!!!", "feature")).toThrow();
  });
});

describe("cli", () => {
  const spec = {
    name: "test",
    description: "test",
    positionals: ["name"],
    flags: [
      { name: "preset", description: "preset" },
      { name: "force", description: "force", boolean: true },
      { name: "with", description: "with", multiple: true },
    ],
  };

  it("parses positionals, --flag value, --flag=value, booleans, --no-*", () => {
    const parsed = parseArgs(["my-app", "--preset", "minimal"], spec);
    expect(parsed.positionals).toEqual(["my-app"]);
    expect(str(parsed, "preset")).toBe("minimal");
    expect(parseArgs(["--force"], spec).flags.force).toBe(true);
    expect(parseArgs(["--force", "--no-force"], spec).flags.force).toBe(false);
    expect(str(parseArgs(["--preset=ide"], spec), "preset")).toBe("ide");
  });

  it("parses multi-value flags as comma lists", () => {
    const parsed = parseArgs(["x", "--with", "a,b", "--with", "c"], spec);
    expect(list(parsed, "with")).toEqual(["a", "b", "c"]);
  });

  it("rejects unknown flags and missing values", () => {
    expect(() => parseArgs(["x", "--nope"], spec)).toThrow("Unknown flag");
    expect(() => parseArgs(["x", "--preset"], spec)).toThrow(
      "requires a value",
    );
  });
});

describe("templates", () => {
  it("renders tokens and reports unresolved ones", () => {
    expect(renderTemplate("hello {{NAME}}", { NAME: "wb" })).toBe("hello wb");
    expect(() => renderTemplate("hello {{NAME}}", {})).toThrow(
      "Unresolved template tokens: NAME",
    );
  });

  it("renders trees deterministically without overwriting", () => {
    const dest = makeTemp("wb-tree-");
    const first = renderTree(
      { "a.txt": "hi {{V}}", "b/c.txt": "{{V}}" },
      { V: "x" },
      { dest },
    );
    expect(first.map((f) => f.status)).toEqual(["created", "created"]);
    expect(() => renderTree({ "a.txt": "other" }, {}, { dest })).toThrow(
      "Refusing to overwrite",
    );
    const forced = renderTree({ "a.txt": "other" }, {}, { dest, force: true });
    expect(forced[0].status).toBe("overwritten");
  });
});

describe("files", () => {
  it("lists files recursively in sorted order", () => {
    const dest = makeTemp("wb-list-");
    ensureDir(join(dest, "b"));
    renderTree({ "b/2.txt": "x", "a.txt": "y" }, {}, { dest });
    expect(listFilesRecursive(dest)).toEqual(["a.txt", "b/2.txt"]);
    expect(exists(join(dest, "a.txt"))).toBe(true);
    expect(exists(join(dest, "missing.txt"))).toBe(false);
  });
});

describe("extension generators --help", () => {
  const cases: Array<[string, string]> = [
    ["generate-project.ts", "generate:project"],
    ["generate-feature.ts", "generate:feature"],
    ["generate-widget.ts", "generate:widget"],
    ["generate-command.ts", "generate:command"],
    ["generate-tool.ts", "generate:tool"],
    ["generate-status-item.ts", "generate:status-item"],
    ["generate-preset.ts", "generate:preset"],
    ["generate-add-preset.ts", "generate:add-preset"],
  ];
  for (const [script, name] of cases) {
    it(`${name} prints usage`, () => {
      const out = runScript(script, "--help");
      expect(out).toContain(`Usage: bun run ${name}`);
    });
  }
});

describe("generate:project", () => {
  it("rejects unknown presets/themes/features before materializing", () => {
    const dest = join(makeTemp("wb-proj-"), "out");
    expect(() =>
      runScript(
        "generate-project.ts",
        `-- bad --preset nope --dest ${dest} --dry-run`,
      ),
    ).toThrow("Unknown preset");
    expect(() =>
      runScript(
        "generate-project.ts",
        `-- bad --theme nope --dest ${dest} --dry-run`,
      ),
    ).toThrow("Unknown theme");
    expect(() =>
      runScript(
        "generate-project.ts",
        `-- bad --preset minimal --without viewport --dest ${dest} --dry-run`,
      ),
    ).toThrow("load-bearing");
    expect(existsSync(dest)).toBe(false);
  });

  it("--dry-run reports the prune plan without writing", () => {
    const dest = join(makeTemp("wb-proj-"), "out");
    const out = runScript(
      "generate-project.ts",
      `-- dry --preset ide --theme light --dest ${dest} --dry-run`,
    );
    expect(out).toContain("kept presets: ide");
    expect(out).toContain("prune features:");
    expect(out).toContain("src/features/showcase");
    expect(out).toContain("src/features/minimal");
    expect(out).not.toContain("src/features/ide,");
    expect(out).toContain("prune themes:");
    expect(out).toContain("src/styles/themes/ocstudio.css");
    expect(out).toContain("rewrite:");
    expect(out).toContain("src/app/router.tsx");
    expect(existsSync(dest)).toBe(false);
  });

  it("--dry-run reports kept presets and the demo cleanup summary", () => {
    const dest = join(makeTemp("wb-proj-"), "out");
    const out = runScript(
      "generate-project.ts",
      `-- dry --preset technical-ribbon --with-presets ide,studio --with-presets operator --dest ${dest} --dry-run`,
    );
    expect(out).toContain(
      "kept presets: technical-ribbon, ide, studio, operator",
    );
    expect(out).toContain("manifest layout: technical-ribbon");
    expect(out).toContain(
      "prune features: src/features/minimal, src/features/monitoring, src/features/setup, src/features/showcase",
    );
    expect(out).toContain("src/features/minimal");
    expect(out).toContain("demo cleanup (technical-ribbon):");
    expect(out).toContain("DemoGeometry");
    expect(out).toContain("demo check (ide, studio, operator):");
    expect(existsSync(dest)).toBe(false);
  });

  it("rejects unknown --with-presets before materializing", () => {
    const dest = join(makeTemp("wb-proj-"), "out");
    expect(() =>
      runScript(
        "generate-project.ts",
        `-- bad --preset minimal --with-presets nope --dest ${dest} --dry-run`,
      ),
    ).toThrow("Unknown preset");
    expect(existsSync(dest)).toBe(false);
  });

  it("materializes a coherent project with marker and transformed identity", () => {
    const parent = makeTemp("wb-proj-");
    const dest = join(parent, "probe-app");
    const out = runScript(
      "generate-project.ts",
      `-- probe-app --preset minimal --without timeline --dest ${dest} --app-name "Probe App"`,
    );
    expect(out).toContain("materialized");
    const marker = JSON.parse(
      readFileSync(join(dest, ".boilerplate.json"), "utf8"),
    );
    expect(marker.template).toBe("tanstack-desktop-workbench");
    expect(marker.schemaVersion).toBe(1);
    expect(marker.preset).toBe("minimal");
    const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
    expect(pkg.name).toBe("probe-app");
    expect(pkg.scripts["generate:project"]).toBeUndefined();
    expect(pkg.scripts["self-test:scaffolding"]).toBeUndefined();
    expect(pkg.scripts["generate:feature"]).toBeDefined();
    expect(pkg.scripts["generate:add-preset"]).toBeDefined();
    const config = readFileSync(
      join(dest, "src", "app", "workbench.config.ts"),
      "utf8",
    );
    expect(config).toContain(`appName: 'Probe App'`);
    expect(config).toContain(`layout: 'minimal'`);
    // Minimal derived project: only the kept preset+theme ship.
    expect(config).toContain(`export type WorkbenchLayoutId = "minimal";`);
    expect(config).toContain(`export type ThemeId = "ocstudio";`);
    expect(config).toContain(
      `export const workbenchThemes: readonly ThemeId[] = ["ocstudio"];`,
    );
    for (const pruned of [
      "ide",
      "studio",
      "operator",
      "monitoring",
      "setup",
      "technical-ribbon",
      "showcase",
    ]) {
      expect(existsSync(join(dest, "src", "features", pruned))).toBe(false);
    }
    expect(existsSync(join(dest, "src", "features", "minimal"))).toBe(true);
    expect(existsSync(join(dest, "src", "styles", "themes", "light.css"))).toBe(
      false,
    );
    expect(
      existsSync(join(dest, "src", "styles", "themes", "ocstudio.css")),
    ).toBe(true);
    const router = readFileSync(join(dest, "src", "app", "router.tsx"), "utf8");
    expect(router).toContain(`"minimal": MinimalWorkbench`);
    expect(router).not.toContain("showcase");
    expect(router).not.toContain("ControlsShowcase");
    expect(router).not.toContain("/demo/controls");
    expect(router).not.toContain("IdeWorkbench");
    // No preview bar in derived projects: the DEMO-ONLY switchers, the
    // preview catalog, and the /presets/$presetId route are pruned;
    // RootLayout renders the Outlet directly under the ErrorBoundary.
    for (const pruned of [
      "PresetSwitcher",
      "ThemeSwitcher",
      "previewPresets",
      "PresetPreviewPage",
      "presetPreviewRoute",
      "/presets/$presetId",
      "workbenchThemes",
    ]) {
      expect(router).not.toContain(pruned);
    }
    expect(router).not.toMatch(/\bLink\b/);
    expect(router).toContain("<Outlet />");
    expect(router).toContain(`path: "/"`);
    const globalCss = readFileSync(
      join(dest, "src", "styles", "global.css"),
      "utf8",
    );
    expect(globalCss).toContain(`@import "./themes/ocstudio.css";`);
    expect(globalCss).not.toContain("light.css");
    // Source-only files stay in the boilerplate, out of derived projects.
    expect(existsSync(join(dest, "scripts", "generate-project.ts"))).toBe(
      false,
    );
    expect(existsSync(join(dest, "scripts", "scaffolding.test.ts"))).toBe(
      false,
    );
    expect(existsSync(join(dest, "scripts", "self-test-scaffolding.ts"))).toBe(
      false,
    );
    expect(
      existsSync(join(dest, "docs", "qa-factory-stability-checklist.md")),
    ).toBe(false);
    expect(existsSync(join(dest, "CHANGELOG.md"))).toBe(false);
    // The derived README describes the app, not the factory.
    const readme = readFileSync(join(dest, "README.md"), "utf8");
    expect(readme).toContain("Probe App");
    expect(readme).toContain("minimal");
    expect(readme).not.toContain("generate:project");
    expect(readme).not.toContain("self-test");
    // Extension generators are kept so the derived app can grow.
    expect(existsSync(join(dest, "scripts", "generate-feature.ts"))).toBe(true);
    // Pruned ai:context test carries the controls-library catalog block:
    // catalog present, one line per control, DataTable/FormField spot-check.
    const prunedAiContextTest = readFileSync(
      join(dest, "scripts", "ai-context.test.ts"),
      "utf8",
    );
    expect(prunedAiContextTest).toContain("Controls library");
    expect(prunedAiContextTest).toContain("DataTable");
    expect(prunedAiContextTest).toContain("FormField");
    expect(prunedAiContextTest).toContain("DataTable.tsx");
    expect(prunedAiContextTest).toContain("Fields.tsx");
    // Primitives are never pruned, so the derived catalog test runs green.
    // bun prints the test summary to stderr, so merge it into stdout.
    const prunedAiContextOut = execSync(
      `bun test scripts/ai-context.test.ts 2>&1`,
      {
        cwd: dest,
        encoding: "utf8",
      },
    );
    expect(prunedAiContextOut).toMatch(/pass/i);
    // No staging leftovers next to the destination.
    expect(existsSync(join(parent, ".scaffold-staging-probe-app"))).toBe(false);
  });

  it("--force refuses foreign dirs but replaces generated ones", () => {
    const parent = makeTemp("wb-force-");
    const foreign = join(parent, "foreign");
    ensureDir(foreign);
    readFileSync(join(REPO_ROOT, "package.json"), "utf8");
    execSync(`echo hi > ${join(foreign, "a.txt")}`);
    expect(() =>
      runScript(
        "generate-project.ts",
        `-- x --preset minimal --dest ${foreign} --force`,
      ),
    ).toThrow("no .boilerplate.json marker");
    expect(readFileSync(join(foreign, "a.txt"), "utf8").trim()).toBe("hi");

    const dest = join(parent, "regen");
    runScript(
      "generate-project.ts",
      `-- regen --preset minimal --dest ${dest}`,
    );
    const out = runScript(
      "generate-project.ts",
      `-- regen2 --preset ide --dest ${dest} --force`,
    );
    expect(out).toContain("materialized");
    const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
    expect(pkg.name).toBe("regen2");
  });
});

describe("generate:add-preset", () => {
  it("fails loudly on unknown presets", () => {
    const parent = makeTemp("wb-add-");
    const dest = join(parent, "probe-add");
    runScript(
      "generate-project.ts",
      `-- probe-add --preset minimal --dest ${dest} --app-name "Probe Add"`,
    );
    expect(() =>
      execSync(
        `bun ${join(dest, "scripts", "generate-add-preset.ts")} -- --from ${REPO_ROOT} --preset nope`,
        { cwd: dest, encoding: "utf8" },
      ),
    ).toThrow("Unknown preset");
  });

  it("refuses existing preset dirs without --force", () => {
    const parent = makeTemp("wb-add-");
    const dest = join(parent, "probe-add");
    runScript(
      "generate-project.ts",
      `-- probe-add --preset minimal --dest ${dest} --app-name "Probe Add"`,
    );
    expect(() =>
      execSync(
        `bun ${join(dest, "scripts", "generate-add-preset.ts")} -- --from ${REPO_ROOT} --preset minimal`,
        { cwd: dest, encoding: "utf8" },
      ),
    ).toThrow("already exists");
  });

  it("copies, wires, and widens the union in temp dirs", () => {
    const parent = makeTemp("wb-add-");
    const dest = join(parent, "probe-add");
    runScript(
      "generate-project.ts",
      `-- probe-add --preset minimal --dest ${dest} --app-name "Probe Add"`,
    );
    const envBefore = process.env.WB_SKIP_AI_CONTEXT_REFRESH;
    process.env.WB_SKIP_AI_CONTEXT_REFRESH = "1";
    try {
      const out = execSync(
        `bun ${join(dest, "scripts", "generate-add-preset.ts")} -- --from ${REPO_ROOT} --preset ide --dry-run`,
        { cwd: dest, encoding: "utf8" },
      );
      expect(out).toContain("Dry run");
      expect(existsSync(join(dest, "src", "features", "ide"))).toBe(false);
      execSync(
        `bun ${join(dest, "scripts", "generate-add-preset.ts")} -- --from ${REPO_ROOT} --preset ide`,
        { cwd: dest, encoding: "utf8" },
      );
    } finally {
      if (envBefore === undefined) {
        delete process.env.WB_SKIP_AI_CONTEXT_REFRESH;
      } else {
        process.env.WB_SKIP_AI_CONTEXT_REFRESH = envBefore;
      }
    }
    expect(existsSync(join(dest, "src", "features", "ide"))).toBe(true);
    expect(
      existsSync(join(dest, "src", "features", "ide", "idePreset.ts")),
    ).toBe(true);
    const router = readFileSync(join(dest, "src", "app", "router.tsx"), "utf8");
    expect(router).toContain(`"ide": IdeWorkbench`);
    expect(router).toContain(`"minimal": MinimalWorkbench`);
    expect(router).toContain("../features/ide/idePreset");
    const config = readFileSync(
      join(dest, "src", "app", "workbench.config.ts"),
      "utf8",
    );
    expect(config).toContain(`"minimal" | "ide"`);
    const presetsTest = readFileSync(
      join(dest, "src", "workbench", "presets.test.ts"),
      "utf8",
    );
    expect(presetsTest).toContain(`"ide"`);
    expect(presetsTest).toContain("../features/ide/idePreset");
    const manifestTest = readFileSync(
      join(dest, "src", "app", "workbench.config.test.ts"),
      "utf8",
    );
    expect(manifestTest).toContain(`"ide"`);
    const aiTest = readFileSync(
      join(dest, "scripts", "ai-context.test.ts"),
      "utf8",
    );
    expect(aiTest).toContain(`"ide"`);
    const marker = JSON.parse(
      readFileSync(join(dest, ".boilerplate.json"), "utf8"),
    );
    expect(marker.presets).toContain("minimal");
    expect(marker.presets).toContain("ide");
  });
});

describe("generate:feature", () => {
  it("scaffolds registry wiring without domain logic", () => {
    // Unique per run: never collide with a concurrent or leftover probe.
    const id = `scaffold-test-probe-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
    const dir = join(REPO_ROOT, "src", "features", id);
    repoProbeDirs.push(dir);
    const contextExisted = existsSync(AI_CONTEXT_FILE);
    const contextBefore = contextExisted
      ? readFileSync(AI_CONTEXT_FILE, "utf8")
      : null;
    const envBefore = process.env.WB_SKIP_AI_CONTEXT_REFRESH;
    // Suppress the ai:context side-effect rewrite: this test must not
    // touch generated-context.md (production default still refreshes).
    process.env.WB_SKIP_AI_CONTEXT_REFRESH = "1";
    try {
      const out = runScript("generate-feature.ts", `-- ${id} --dry-run`);
      expect(out).toContain("feature.ts");
      runScript("generate-feature.ts", `-- ${id}`);
      const feature = readFileSync(join(dir, "feature.ts"), "utf8");
      expect(feature).toContain("registerFeature");
      expect(feature).not.toContain("WorkbenchShell");
      // The opt-out must hold: no rewrite of the generated context file.
      if (contextBefore !== null) {
        expect(readFileSync(AI_CONTEXT_FILE, "utf8")).toBe(contextBefore);
      } else {
        expect(existsSync(AI_CONTEXT_FILE)).toBe(false);
      }
    } finally {
      // Always restore: env, generated context file, and source tree.
      if (envBefore === undefined) {
        delete process.env.WB_SKIP_AI_CONTEXT_REFRESH;
      } else {
        process.env.WB_SKIP_AI_CONTEXT_REFRESH = envBefore;
      }
      if (contextBefore !== null) {
        writeFileSync(AI_CONTEXT_FILE, contextBefore, "utf8");
      } else if (existsSync(AI_CONTEXT_FILE)) {
        rmSync(AI_CONTEXT_FILE, { force: true });
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
