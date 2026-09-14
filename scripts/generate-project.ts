#!/usr/bin/env bun
/**
 * Materialize a derived application from this boilerplate.
 *
 * Validates preset/theme/features against the real canonical registries
 * BEFORE writing anything, stages the result in a sibling temp dir, then
 * moves it to the destination atomically at the end. Failures remove the
 * staging dir and never touch a previous destination.
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bool,
  type CommandSpec,
  fail,
  list,
  type ParsedArgs,
  parseArgs,
  printHelpIfRequested,
  str,
} from "./_lib/cli";
import { ensureDir, isNonEmptyDir, readJson, removeDir } from "./_lib/files";
import { toCamel, toKebab, toTitle } from "./_lib/naming";
import {
  PRESET_FEATURE_DIRS,
  PRESET_ROUTER_WIRING,
  pruneLoadBearing,
  VIEWPORT_FREE_PRESET_DIRS,
} from "./_lib/preset-wiring";
import { escapeTsString, renderTemplate } from "./_lib/templates";

const SCRIPT = "generate:project";
const TEMPLATE_ID = "tanstack-desktop-workbench";
const MARKER_FILE = ".boilerplate.json";

const spec: CommandSpec = {
  name: "generate:project",
  description:
    "Materialize a derived application from the boilerplate into <name> (or --dest).",
  positionals: ["name"],
  flags: [
    {
      name: "preset",
      description: "Layout preset id",
      default: "technical-ribbon",
    },
    {
      name: "with-presets",
      description: "Extra presets to keep (comma-separated)",
      multiple: true,
    },
    { name: "theme", description: "Theme id", default: "ocstudio" },
    {
      name: "with",
      description: "Extra features (comma-separated)",
      multiple: true,
    },
    {
      name: "without",
      description: "Disabled preset features (comma-separated)",
      multiple: true,
    },
    {
      name: "app-name",
      description: "Display name (default: Title Case of project name)",
    },
    { name: "dest", description: "Destination directory (default: ../<name>)" },
    {
      name: "force",
      description: "Replace destination only with a valid marker",
      boolean: true,
    },
    {
      name: "install",
      description: "Run bun install in the new project",
      boolean: true,
    },
    {
      name: "git",
      description: "Run git init in the new project",
      boolean: true,
    },
    {
      name: "dry-run",
      description: "Validate and report without writing",
      boolean: true,
    },
  ],
};

const EXAMPLES = [
  "bun run generate:project -- printnc-control --preset technical-ribbon --theme ocstudio --with console",
  "bun run generate:project -- my-app --preset minimal --dest ../my-app --install --git",
];

interface BoilerplateMarker {
  schemaVersion: number;
  template: string;
  sourceVersion: string;
  sourceCommit: string;
  preset: string;
  /** All kept presets (primary + --with-presets); absent in markers v1. */
  presets?: string[];
  theme: string;
}

interface WorkbenchModel {
  presetIds: string[];
  presets: Map<string, { id: string; raw: unknown }>;
  themes: string[];
  features: string[];
  resolveOrThrow: (
    presetId: string,
    overrides: { with?: string[]; without?: string[] },
  ) => string[];
  sourceVersion: string;
  sourceCommit: string;
  repoRoot: string;
}

function isPresetLike(value: unknown): value is { id: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slots === "object" &&
    candidate.slots !== null &&
    Array.isArray(candidate.defaultFeatures)
  );
}

/** Repo root = parent of scripts/. Fails when it is not the boilerplate. */
function validateRepoRoot(): string {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) {
    fail(`Repository root not found at "${repoRoot}".`);
  }
  const pkg = readJson<{ name?: string; version?: string }>(pkgPath);
  if (pkg.name !== "tanstack-workbench") {
    fail(`Expected boilerplate package "tanstack-workbench" at "${repoRoot}".`);
  }
  return repoRoot;
}

function gitCommit(repoRoot: string): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Load the canonical model from the real sources: preset ids from the
 * actual *Preset.ts modules (globbed, not listed), themes from
 * workbench.config.ts, features from the feature registry module.
 */
async function loadModel(repoRoot: string): Promise<WorkbenchModel> {
  const featuresDir = join(repoRoot, "src", "features");
  const { createPresetRegistry } = await import("../src/workbench/layouts");
  const { KNOWN_FEATURES, resolveFeaturesOrThrow } = await import(
    "../src/workbench/features"
  );
  const { workbenchThemes } = await import("../src/app/workbench.config");
  type FeaturesModule = typeof import("../src/workbench/features");
  const typedResolve: FeaturesModule["resolveFeaturesOrThrow"] =
    resolveFeaturesOrThrow;
  const asOverrideIds = (
    ids: string[] | undefined,
  ): NonNullable<Parameters<typeof typedResolve>[1]>["with"] =>
    ids as "viewport"[];
  const pkg = readJson<{ version?: string }>(join(repoRoot, "package.json"));

  const registry = createPresetRegistry();
  for (const feature of readdirSync(featuresDir).sort()) {
    let entries: string[];
    try {
      entries = readdirSync(join(featuresDir, feature)).sort();
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith("Preset.ts") || entry.endsWith(".test.ts")) {
        continue;
      }
      const modulePath = join(featuresDir, feature, entry);
      const mod = (await import(modulePath)) as Record<string, unknown>;
      for (const exported of Object.values(mod)) {
        if (isPresetLike(exported)) {
          if (!registry.has(exported.id)) {
            registry.registerPreset(
              exported as Parameters<typeof registry.registerPreset>[0],
            );
          }
        }
      }
    }
  }
  const presets = new Map<string, { id: string; raw: unknown }>();
  for (const preset of registry.list()) {
    presets.set(preset.id, { id: preset.id, raw: preset });
  }
  if (presets.size === 0) {
    fail("No layout presets found in src/features/*/*Preset.ts.");
  }
  return {
    presetIds: [...presets.keys()].sort(),
    presets,
    themes: [...workbenchThemes],
    features: [...KNOWN_FEATURES],
    resolveOrThrow: (presetId, overrides) => {
      const preset = registry.get(presetId);
      if (!preset) {
        fail(
          `Unknown preset "${presetId}". Known presets: ${[...presets.keys()].sort().join(", ")}.`,
        );
      }
      return typedResolve(preset, {
        with: asOverrideIds(overrides.with),
        without: asOverrideIds(overrides.without),
      }) as string[];
    },
    sourceVersion: pkg.version ?? "0.0.0",
    sourceCommit: gitCommit(repoRoot),
    repoRoot,
  };
}

/**
 * Files that belong to the boilerplate source but NOT to derived projects:
 * the project materializer itself, its tests (unit + self-test), the
 * factory QA checklist, and the boilerplate release history. Extension
 * generators (feature/widget/command/tool/status-item/preset) are KEPT so
 * derived apps can keep extending themselves.
 */
const SOURCE_ONLY = new Set([
  "scripts/generate-project.ts",
  "scripts/scaffolding.test.ts",
  "scripts/self-test-scaffolding.ts",
  "docs/qa-factory-stability-checklist.md",
  "CHANGELOG.md",
  ".codegraph",
]);

const ALWAYS_EXCLUDED = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "backups",
]);

function copySourceToStaging(repoRoot: string, staging: string): void {
  ensureDir(staging);
  const topLevelSourceOnly = new Set(
    [...SOURCE_ONLY].filter((p) => !p.includes("/")),
  );
  for (const entry of readdirSync(repoRoot)) {
    if (ALWAYS_EXCLUDED.has(entry) || topLevelSourceOnly.has(entry)) {
      continue;
    }
    if (entry.startsWith(".scaffold-staging-")) {
      continue;
    }
    cpSync(join(repoRoot, entry), join(staging, entry), { recursive: true });
  }
  for (const sourceOnly of SOURCE_ONLY) {
    removeDir(join(staging, sourceOnly));
  }
}

function renderWorkbenchConfig(options: {
  appName: string;
  layout: string;
  keptPresets: string[];
  theme: string;
  withFeatures: string[];
  withoutFeatures: string[];
}): string {
  // Minimal derived project: the manifest names the kept preset catalog
  // (one entry, or a union with --with-presets) and one theme (the
  // pruned catalog). The boilerplate source keeps the full unions; only
  // staging copies are rewritten here. Switching presets is config, not
  // generation: set `layout` to any kept preset id, then run
  // `bun run ai:context` to refresh the generated context.
  const layoutUnion = options.keptPresets.map((id) => `"${id}"`).join(" | ");
  const lines = [
    `import type { FeatureId } from "../workbench/types";`,
    ``,
    `/**`,
    ` * Application manifest: declarative description of this workbench instance.`,
    ` * Generated by \`bun run generate:project\`; edit values freely, then run`,
    ` * \`bun run ai:context\` to refresh generated context.`,
    ` * Known preset ids come from the preset registry`,
    ` * (see src/workbench/layouts.ts); themes from src/styles/themes/*.css.`,
    ` */`,
    `export type WorkbenchLayoutId = {{LAYOUT_UNION}};`,
    ``,
    `/** Theme id (see src/styles/themes/*.css). Applied to <html> data-theme. */`,
    `export type ThemeId = "{{THEME}}";`,
    ``,
    `/** All known theme ids; stored themes outside this list fall back to the manifest. */`,
    `export const workbenchThemes: readonly ThemeId[] = ["{{THEME}}"];`,
    ``,
    `/** Validate a stored or external theme value against the known theme ids. */`,
    `export function isThemeId(value: unknown): value is ThemeId {`,
    `  return (`,
    `    typeof value === "string" &&`,
    `    (workbenchThemes as readonly string[]).includes(value)`,
    `  );`,
    `}`,
    ``,
    `export interface WorkbenchConfig {`,
    `  /** Display name of the application. */`,
    `  appName: string;`,
    `  /** Layout preset id (see src/workbench/layouts.ts preset registry). */`,
    `  layout: WorkbenchLayoutId;`,
    `  /** Extra features enabled on top of the preset defaults. */`,
    `  with?: FeatureId[];`,
    `  /** Preset default features disabled; the result stays coherent. */`,
    `  without?: FeatureId[];`,
    `  /** Theme id (see src/styles/themes/*.css). Applied to <html> data-theme. */`,
    `  theme: ThemeId;`,
    `}`,
    ``,
    `export const workbenchConfig: WorkbenchConfig = {`,
    `  appName: '{{APP_NAME}}',`,
    `  layout: '{{LAYOUT}}',`,
    `  theme: '{{THEME}}',`,
    `{{WITH_LINE}}{{WITHOUT_LINE}}};`,
    ``,
  ];
  const withLine =
    options.withFeatures.length > 0
      ? `  with: [${options.withFeatures.map((f) => `'${f}'`).join(", ")}],\n`
      : "";
  const withoutLine =
    options.withoutFeatures.length > 0
      ? `  without: [${options.withoutFeatures.map((f) => `'${f}'`).join(", ")}],\n`
      : "";
  return renderTemplate(lines.join("\n"), {
    APP_NAME: escapeTsString(options.appName),
    LAYOUT: options.layout,
    LAYOUT_UNION: layoutUnion,
    THEME: options.theme,
    WITH_LINE: withLine,
    WITHOUT_LINE: withoutLine,
  });
}

/**
 * Minimal-derived-project pruning. ALL of this runs on STAGING copies;
 * the boilerplate source is never modified (it keeps all 10 presets and
 * both themes, and `bun run validate` stays green there).
 *
 * Per-preset file strategy (verified by grep on the real source):
 * - No preset workbench imports `src/features/showcase/*` (only
 *   `src/app/router.tsx` does, for the `/demo/controls` route). The
 *   ide/studio/operator/technical-ribbon "demo" imports resolve to
 *   `src/components/workbench/widgets/DemoWidgets.tsx`, which is core
 *   and is KEPT; monitoring/setup ship their own local demo data
 *   (`monitoringDemo.ts`, `setupDemo.ts`) inside their own kept
 *   directory. So deleting `showcase/` needs NO import rewrites in the
 *   kept preset; a guard below fails loudly if a kept preset ever
 *   references showcase again.
 * - Router wiring per preset (component + side-effect preset
 *   registration) is mapped explicitly in PRESET_ROUTER_WIRING (see
 *   scripts/_lib/preset-wiring.ts, the single source of truth); the
 *   staging router is rewritten to the single kept entry.
 */

/** Staging-relative files whose contents are rewritten for the pruned catalog. */
const PRUNED_REWRITES = [
  "src/app/workbench.config.ts",
  "src/app/router.tsx",
  "src/styles/global.css",
  "src/styles/themes/theme-parity.test.ts",
  "src/workbench/presets.test.ts",
  "src/app/workbench.config.test.ts",
  "scripts/ai-context.test.ts",
  "scripts/validate-architecture.ts",
];

function prunePlan(
  keptPresets: string[],
  theme: string,
  knownThemes: string[],
): { featureDirs: string[]; themeFiles: string[] } {
  return {
    featureDirs: [
      ...PRESET_FEATURE_DIRS.filter((dir) => !keptPresets.includes(dir)).map(
        (dir) => `src/features/${dir}`,
      ),
      "src/features/showcase",
      ...VIEWPORT_FREE_PRESET_DIRS.filter(
        (dir) => !keptPresets.includes(dir),
      ).map((dir) => `src/features/${dir}`),
    ],
    themeFiles: knownThemes
      .filter((id) => id !== theme)
      .map((id) => `src/styles/themes/${id}.css`),
  };
}

function prunePlanReport(
  keptPresets: string[],
  theme: string,
  knownThemes: string[],
): string {
  const plan = prunePlan(keptPresets, theme, knownThemes);
  const primary = keptPresets[0];
  return [
    `  kept presets: ${keptPresets.join(", ")} (manifest layout: ${primary}; switch via the layout key in src/app/workbench.config.ts)`,
    `  prune features: ${plan.featureDirs.join(", ")} (keep ${keptPresets.map((id) => `src/features/${id}`).join(", ")} + custom feature dirs)`,
    `  prune themes: ${plan.themeFiles.join(", ") || "(none)"} (keep src/styles/themes/${theme}.css)`,
    `  rewrite: ${PRUNED_REWRITES.join(", ")}`,
    ...cleanupReportLines(keptPresets).map((line) => `  ${line}`),
  ].join("\n");
}

function replaceOrThrow(
  source: string,
  pattern: string | RegExp,
  replacement: string,
  what: string,
): string {
  const after =
    typeof pattern === "string"
      ? source.replace(pattern, replacement)
      : source.replace(pattern, replacement as string);
  if (after === source) {
    fail(
      `Prune failure (${what}): expected pattern not found; the boilerplate source template may have drifted.`,
    );
  }
  return after;
}

/**
 * Rewrite the staging router to the kept presets (no preview/demo chrome).
 * The first entry of keptPresets is the manifest layout; the index route
 * resolves through workbenchConfig.layout, so switching presets is a
 * config edit, not a router edit.
 */
function pruneRouterText(source: string, keptPresets: string[]): string {
  for (const id of keptPresets) {
    if (!PRESET_ROUTER_WIRING[id]) {
      fail(`Prune failure: no router wiring for preset "${id}".`);
    }
  }
  let out = source;
  out = replaceOrThrow(
    out,
    `import { ControlsShowcase } from "../features/showcase/ControlsShowcase";\n`,
    "",
    "router showcase import",
  );
  for (const [id, entry] of Object.entries(PRESET_ROUTER_WIRING)) {
    if (keptPresets.includes(id)) {
      continue;
    }
    out = replaceOrThrow(
      out,
      `import { ${entry.component} } from "${entry.componentFrom}";\n`,
      "",
      `router component import (${id})`,
    );
    out = replaceOrThrow(
      out,
      `import "${entry.presetSideEffect}";\n`,
      "",
      `router preset import (${id})`,
    );
  }
  const keptEntries = keptPresets
    .map((id) => {
      const entry = PRESET_ROUTER_WIRING[id];
      return `  "${id}": ${entry.component},`;
    })
    .join("\n");
  out = replaceOrThrow(
    out,
    /const presetComponents: Record<string, PresetComponent> = \{[^}]*\};/,
    `const presetComponents: Record<string, PresetComponent> = {\n${keptEntries}\n};`,
    "router presetComponents",
  );
  // The preview bar is DEMO-ONLY: with a single preset there is nothing
  // to preview, so the whole previewPresets catalog goes (not collapsed).
  // NOTE: the switcher/route removals below run AFTER the demo-route
  // steps: the /demo/controls Link lives inside PresetSwitcher, so the
  // demo-link prune must see it first.
  out = replaceOrThrow(
    out,
    /const previewPresets = \[[^\]]*\];\n\n/,
    "",
    "router previewPresets",
  );
  out = replaceOrThrow(
    out,
    / +<Link\n +to="\/demo\/controls"\n[\s\S]*? +<\/Link>\n/,
    "",
    "router demo controls link",
  );
  out = replaceOrThrow(
    out,
    / *const demoControlsRoute = createRoute\(\{[\s\S]*?\n *\}\);(\n)?/,
    "",
    "router demoControlsRoute",
  );
  out = replaceOrThrow(
    out,
    "  demoControlsRoute,\n",
    "",
    "router routeTree demo entry",
  );
  // DEMO-ONLY ThemeSwitcher definition: the source doc comment it carries
  // anchors the match. Any template drift fails loudly instead of leaking
  // preview UI into the derived app.
  out = replaceOrThrow(
    out,
    /\/\*\*\n \* DEMO-ONLY theme switcher: toggles the applied theme at runtime\.\n \* Not part of the shell; it reuses the theme write-back path\.\n \*\/\nfunction ThemeSwitcher\(\{[\s\S]*?\n\}\n\n/,
    "",
    "router ThemeSwitcher definition",
  );
  // DEMO-ONLY PresetSwitcher definition (preset links + theme switcher
  // usage; the /demo/controls Link was pruned above). The source says
  // generated apps delete it and render one preset.
  out = replaceOrThrow(
    out,
    /\/\*\*\n \* DEMO-ONLY preset switcher: plain links for comparing presets\. Not part of\n \* the shell; generated applications delete it and render one preset\.\n \*\/\nfunction PresetSwitcher\(\{[\s\S]*?\n\}\n\n/,
    "",
    "router PresetSwitcher definition",
  );
  // RootLayout keeps the theme init + ErrorBoundary and renders the
  // Outlet directly: drop the preview-bar wrapper and its state setter.
  out = replaceOrThrow(
    out,
    `      <div className="flex h-screen w-screen flex-col overflow-hidden">\n        <PresetSwitcher theme={theme} onThemeChange={setTheme} />\n        <div className="flex min-h-0 flex-1 flex-col">\n          <Outlet />\n        </div>\n      </div>`,
    `      <Outlet />`,
    "router RootLayout preview wrapper",
  );
  out = replaceOrThrow(
    out,
    `  const [theme, setTheme] = useState(resolveInitialTheme);`,
    `  const [theme] = useState(resolveInitialTheme);`,
    "router RootLayout theme state",
  );
  // The /presets/$presetId preview route makes no sense in a derived
  // app: preset switching is a `layout` edit in workbench.config.ts.
  out = replaceOrThrow(
    out,
    /function PresetPreviewPage\(\) \{[\s\S]*?\n\}\n\n/,
    "",
    "router PresetPreviewPage",
  );
  out = replaceOrThrow(
    out,
    /const presetPreviewRoute = createRoute\(\{[\s\S]*?\n\}\);\n/,
    "",
    "router presetPreviewRoute",
  );
  out = replaceOrThrow(
    out,
    "  presetPreviewRoute,\n",
    "",
    "router routeTree preview entry",
  );
  // Import cleanup: Link only fed the preview/demo links, workbenchThemes
  // only fed the ThemeSwitcher. Both would fail lint as unused imports.
  out = replaceOrThrow(out, `  Link,\n`, "", "router Link import");
  out = replaceOrThrow(
    out,
    `  workbenchConfig,\n  workbenchThemes,\n`,
    `  workbenchConfig,\n`,
    "router workbenchThemes import",
  );
  // Formatting: route removals can leave stacked blank lines; collapse
  // them so the derived project stays lint-clean (one blank line max).
  out = out.replace(/\n{3,}/g, "\n\n");
  // Containment guard: no preview/demo identifier may survive. Every
  // branch above fails loudly on drift, and this catches partial prunes.
  for (const leftover of [
    "PresetSwitcher",
    "ThemeSwitcher",
    "previewPresets",
    "PresetPreviewPage",
    "presetPreviewRoute",
    "/presets/$presetId",
    "ControlsShowcase",
    "showcase",
    "/demo/controls",
    "workbenchThemes",
  ]) {
    if (out.includes(leftover)) {
      fail(
        `Prune failure: staging router still references preview/demo code (${leftover}) after pruning.`,
      );
    }
  }
  if (/\bLink\b/.test(out)) {
    fail(
      `Prune failure: staging router still references preview/demo code (Link) after pruning.`,
    );
  }
  // Positive guard: the derived router keeps a working shell (theme init
  // + ErrorBoundary + direct Outlet) and every kept preset route.
  for (const marker of [
    "<Outlet />",
    "ErrorBoundary",
    ...keptPresets.map((id) => `"${id}"`),
  ]) {
    if (!out.includes(marker)) {
      fail(
        `Prune failure: staging router lost its working shell (${marker}); the boilerplate source template may have drifted.`,
      );
    }
  }
  return out;
}

/** Keep only the chosen theme import in the staging global.css. */
function pruneGlobalCssText(source: string, theme: string): string {
  const stripped = source.replace(/@import "\.\/themes\/[^"]*";\n?/g, "");
  if (stripped === source) {
    fail(
      `Prune failure (global.css): no theme @import found; the boilerplate source template may have drifted.`,
    );
  }
  return replaceOrThrow(
    stripped,
    `@import "./tokens.css";\n`,
    `@import "./tokens.css";\n@import "./themes/${theme}.css";\n`,
    "global.css theme import",
  );
}

/** Dynamic theme-file discovery so the parity test passes with one theme. */
function prunedThemeParityTest(): string {
  return `import { readdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

/**
 * Theme token parity (pruned derived project): every REMAINING theme file
 * must define the same --wb-* custom property set. With a single theme
 * the parity check is trivially green; coverage against tokens.css
 * still applies. The boilerplate source keeps the hardcoded two-theme
 * list; only staging copies are rewritten here.
 */
const themeFiles = readdirSync(dirname(fileURLToPath(import.meta.url)))
  .filter((name) => name.endsWith(".css"))
  .sort();

function themeUrl(file: string): URL {
  return new URL(\`./\${file}\`, import.meta.url);
}

function extractTokens(css: string): Set<string> {
  return new Set(css.match(/--wb-[a-z0-9-]+/g) ?? []);
}

describe("theme token parity", () => {
  it("declares its own data-theme selector in every theme file", async () => {
    expect(themeFiles.length).toBeGreaterThan(0);
    for (const file of themeFiles) {
      const css = await Bun.file(themeUrl(file)).text();
      const id = file.replace(/\\.css$/, "");
      expect(css).toContain(\`[data-theme="\${id}"]\`);
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
`;
}

/**
 * Side-effect imports that register the kept presets in a staging test.
 * Both staging test locations (`src/workbench/*` and `src/app/*`) address
 * features as `../features/...`, mirroring PRESET_ROUTER_WIRING.
 */
function presetSideEffectImports(keptPresets: string[]): string {
  return keptPresets
    .map((id) => {
      const wiring = PRESET_ROUTER_WIRING[id];
      if (!wiring) {
        fail(`Prune failure: no router wiring for preset "${id}".`);
      }
      return `import "${wiring.presetSideEffect}";`;
    })
    .join("\n");
}

/** Pruned catalog test: only the kept presets are registered and coherent. */
function prunedPresetsTest(keptPresets: string[]): string {
  const primary = keptPresets[0];
  const keptList = keptPresets.map((id) => `"${id}"`).join(", ");
  const resolveBlocks = keptPresets
    .map(
      (id) => `    const ${toCamel(id)} = globalPresets.get("${id}");
    if (!${toCamel(id)}) {
      throw new Error('Kept preset "${id}" is not registered');
    }
    expect(resolveFeaturesOrThrow(${toCamel(id)})).toContain("${pruneLoadBearing(id)}");`,
    )
    .join("\n\n");
  return `import { describe, expect, it } from "bun:test";
${presetSideEffectImports(keptPresets)}
import { resolveFeaturesOrThrow } from "./features";
import { globalPresets } from "./layouts";

/**
 * Preset catalog (pruned derived project): only the kept presets
 * (${keptList}) ship. The boilerplate source asserts all ten presets;
 * only staging copies are rewritten here. Switching presets is a layout value
 * edit in src/app/workbench.config.ts, not a catalog change.
 */
describe("preset catalog (pruned)", () => {
  it("registers every kept preset", () => {
    for (const id of [${keptList}]) {
      expect(globalPresets.has(id)).toBe(true);
    }
  });

  it("resolves every kept preset defaults without errors", () => {
${resolveBlocks}
    expect(globalPresets.get("${primary}")).toBeDefined();
  });
});
`;
}

/** Pruned manifest test: asserts the kept layout+theme. */
function prunedWorkbenchConfigTest(
  keptPresets: string[],
  theme: string,
): string {
  const primary = keptPresets[0];
  const keptList = keptPresets.map((id) => `"${id}"`).join(", ");
  return `import { describe, expect, it } from "bun:test";
${presetSideEffectImports(keptPresets)}
import { resolveFeaturesOrThrow } from "../workbench/features";
import { globalPresets } from "../workbench/layouts";
import { workbenchConfig } from "./workbench.config";

/**
 * Workbench manifest (pruned derived project): the manifest layout is
 * "${primary}" with theme "${theme}". Any kept preset ([${keptList}])
 * is a valid layout value; only staging copies are rewritten here.
 */
describe("workbench manifest (pruned)", () => {
  it("declares the kept layout", () => {
    expect(workbenchConfig.layout).toBe("${primary}");
  });

  it("declares the kept theme", () => {
    expect(workbenchConfig.theme).toBe("${theme}");
  });

  it("resolves the manifest layout to a registered preset", () => {
    const kept = globalPresets.get(workbenchConfig.layout);
    expect(kept).toBeDefined();
    expect([${keptList}]).toContain(kept?.id ?? "missing");
  });

  it("resolves the manifest features without errors", () => {
    const kept = globalPresets.get(workbenchConfig.layout);
    if (!kept) {
      throw new Error("Manifest preset is not registered");
    }
    const features = resolveFeaturesOrThrow(kept, workbenchConfig);
    const loadBearing = kept.loadBearing ?? ["${pruneLoadBearing(primary)}"];
    for (const feature of loadBearing) {
      expect(features).toContain(feature);
    }
  });
});
`;
}

/**
 * Prune staging to the minimal derived project: delete unchosen preset
 * dirs + showcase, delete unchosen theme files, rewrite the catalog
 * enumerations. Custom `src/features/*` dirs (app extensions created via
 * generate:feature) are KEPT: only the ten known preset dirs and
 * showcase are ever removed.
 */
/**
 * Pruned ai:context snapshot test: asserts the DERIVED catalog (project
 * name, kept preset+theme) instead of the boilerplate's full catalog.
 * Determinism/generated-marker/check tests are kept verbatim.
 */
function prunedAiContextTest(
  projectName: string,
  keptPresets: string[],
  theme: string,
): string {
  const primary = keptPresets[0];
  const sortedList = [...keptPresets]
    .sort()
    .map((id) => `"${id}"`)
    .join(", ");
  const primaryLoadBearing =
    primary === "forms" || primary === "settings"
      ? `"form"`
      : primary === "records"
        ? `"data-table"`
        : `"viewport"`;
  return `/**
 * AI context tests (pruned derived project): the snapshot is built from the
 * real derived state, generation is deterministic, and --check detects drift.
 * The boilerplate source pins its own name and full catalog; only staging
 * copies are rewritten here.
 */
import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readText, writeFile } from "./_lib/files";
import { buildAiContext } from "./generate-ai-context";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const OUTPUT = join(REPO_ROOT, "docs", "ai", "generated-context.md");

describe("ai:context snapshot", () => {
  it("describes the real derived state, not a manual list", async () => {
    const { snapshot, digest } = await buildAiContext(REPO_ROOT);
    expect(snapshot.packageName).toBe("${projectName}");
    expect(snapshot.preset).toBe("${primary}");
    expect(snapshot.theme).toBe("${theme}");
        expect(snapshot.presetIds).toEqual([${sortedList}]);
        expect(snapshot.themes).toEqual(["${theme}"]);
        expect(snapshot.resolvedFeatures).toContain(${primaryLoadBearing});
    // Registry content ships with preset files: the trimmed
    // technical-ribbon example carries a minimal set of
    // widget/command/tool/status registrations, so other derived
    // catalogs legitimately list few or none. Assert structure,
    // not demo content.
    for (const id of [
      ...snapshot.widgets,
      ...snapshot.commands,
      ...snapshot.tools,
      ...snapshot.statusItems,
    ]) {
      expect(id).toMatch(/^[\\w.:~-]+$/);
    }
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
        expect(content).toContain(\`digest: \${digest}\`);
      });
    });
    
    describe("ai:context controls library (pruned)", () => {
      it("keeps the shared primitives catalog with one line per control", async () => {
        const { snapshot, content } = await buildAiContext(REPO_ROOT);
        const tick = String.fromCharCode(96);
        expect(snapshot.controls.length).toBeGreaterThan(0);
        expect(content).toContain("## Controls library");
        for (const control of snapshot.controls) {
          expect(control.name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
          expect(control.purpose.length).toBeGreaterThan(0);
          expect(content).toContain(
            tick + control.name + tick + " (" + tick + control.file + tick + ")",
          );
        }
      });
    
      it("spot-checks canonical controls with their files", async () => {
        const { snapshot, content } = await buildAiContext(REPO_ROOT);
        const byName = new Map(
          snapshot.controls.map((control) => [control.name, control]),
        );
        expect(byName.get("DataTable")?.family).toBe("tables");
        expect(byName.get("DataTable")?.file).toBe("DataTable.tsx");
        expect(byName.get("FormField")?.family).toBe("forms");
        expect(byName.get("FormField")?.file).toBe("Fields.tsx");
        expect(content).toContain("\`DataTable\` (\`DataTable.tsx\`)");
        expect(content).toContain("\`FormField\` (\`Fields.tsx\`)");
      });
    });
    
    describe("ai:context:check", () => {
  it("passes when the file matches the regenerated snapshot", async () => {
    const { content } = await buildAiContext(REPO_ROOT);
    expect(readText(OUTPUT)).toBe(content);
    const out = execSync(
      \`bun \${join(SCRIPTS_DIR, "generate-ai-context.ts")} --check\`,
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      },
    );
    expect(out).toContain("is fresh");
  });

  it("fails with the stale message when the file drifts", () => {
    const original = readText(OUTPUT);
    try {
      writeFile(OUTPUT, \`\${original}\\n<!-- drift -->\\n\`, { force: true });
      expect(() =>
        execSync(\`bun \${join(SCRIPTS_DIR, "generate-ai-context.ts")} --check\`, {
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
`;
}

/**
 * Point the scaffolding template-token smoke probes at an existing
 * feature dir. `--feature` only requires `src/features/<id>/` to exist,
 * so the kept preset dir works; unknown `--command` values only warn.
 * The boilerplate source keeps probing `technical-ribbon`.
 */
function pruneValidateArchitectureText(source: string, preset: string): string {
  const occurrences = source.split("--feature technical-ribbon").length - 1;
  if (occurrences === 0) {
    fail(
      `Prune failure (validate-architecture.ts): no "--feature technical-ribbon" probe found; the boilerplate source template may have drifted.`,
    );
  }
  // No-op when the kept preset is technical-ribbon (probes already match).
  return source.replaceAll("--feature technical-ribbon", `--feature ${preset}`);
}

/**
 * Minimal README for the DERIVED application. It replaces the factory
 * README (pruned below): names the app, its resolved preset+theme+
 * features, the commands the derived project keeps, and pointers to the
 * kept docs. It never mentions factory-only workflows.
 */
function renderDerivedReadme(options: {
  appName: string;
  preset: string;
  keptPresets: string[];
  theme: string;
  withFeatures: string[];
  withoutFeatures: string[];
  resolvedFeatures: string[];
}): string {
  const multi = options.keptPresets.length > 1;
  const lines = [
    `# ${options.appName}`,
    ``,
    `${options.appName} is a desktop-style workbench application.`,
    ``,
    `## Configuration`,
    ``,
    `- Preset: \`${options.preset}\``,
    `- Theme: \`${options.theme}\``,
    ...(multi
      ? [
          `- Extra presets: ${options.keptPresets
            .flatMap((id) => (id !== options.preset ? [`\`${id}\``] : []))
            .join(
              ", ",
            )} (switch via the \`layout\` key in \`src/app/workbench.config.ts\`)`,
        ]
      : []),
    `- Features: ${options.resolvedFeatures.map((f) => `\`${f}\``).join(", ")}`,
    ...(options.withFeatures.length > 0
      ? [
          `- Enabled on top of the preset defaults: ${options.withFeatures.map((f) => `\`${f}\``).join(", ")}`,
        ]
      : []),
    ...(options.withoutFeatures.length > 0
      ? [
          `- Disabled from the preset defaults: ${options.withoutFeatures.map((f) => `\`${f}\``).join(", ")}`,
        ]
      : []),
    ``,
    `The declarative manifest lives in \`src/app/workbench.config.ts\`; edit its`,
    `values freely, then run \`bun run ai:context\` to refresh the generated context.`,
    ``,
    `## Commands`,
    ``,
    `- \`bun run dev\` — start the dev server`,
    `- \`bun run build\` — production build`,
    `- \`bun run validate\` — lint + typecheck + tests + architecture/workbench checks + fresh-context check + build`,
    `- Extension generators (kept, so the app can keep growing):`,
    `  - \`bun run generate:feature\`, \`bun run generate:widget\`, \`bun run generate:command\`,`,
    `    \`bun run generate:tool\`, \`bun run generate:status-item\`, \`bun run generate:preset\``,
    `- \`bun run ai:context\` / \`bun run ai:context:check\` — regenerate / verify the generated context`,
    `- Add a boilerplate preset later: \`bun run generate:add-preset -- --from <boilerplate-dir> --preset <id>\` (copies \`src/features/<id>\` with full wiring)`,
    ``,
    `## Docs`,
    ``,
    `- \`docs/scaffolding.md\` — how the kept extension generators work`,
    `- \`docs/ai/generated-context.md\` — generated snapshot of this app (do not edit manually)`,
    ``,
  ];
  return lines.join("\n");
}

/**
 * Clean-by-default demo cleanup (STAGING ONLY, never the source).
 *
 * A derived technical-ribbon project ships ONE working end-to-end example
 * per extension point instead of the factory demo catalog:
 * - Viewport: empty (no DemoGeometry), ready for app content.
 * - Ribbon: 1 tab (Home) with 1 group (Draw) and 3 tools
 *   (select + line + circle, each wired to its command with shortcut).
 * - Rail: the same 3 tools, in the same order.
 * - Commands: tool.select (V), draw.line (L), draw.circle (C) selecting
 *   their tool through the ToolRegistry, plus grid.toggle (G).
 * - Widgets: 1 visible inspector widget (properties).
 * - Status: 1 real toggle (grid, driving ViewportGrid visibility).
 * Everything else (Annotate/View/Manage tabs, ~40 noop commands, extra
 * demo widgets, ortho/osnap aids, DemoGeometry) is removed.
 *
 * Coherence is structural: every ribbon/rail tool id exists in the tool
 * defs, every tool command is registered, and no unused imports survive
 * (the derived project must pass strict tsc + lint + tests).
 *
 * Other presets (ide/studio/operator/monitoring/setup/minimal/forms/records/settings) carry no
 * demo command catalog: verified by grep on the real source, ide/studio/
 * operator render DemoWidgets widget components structurally (no demo
 * command/tool registrations, no DemoGeometry), monitoring/setup ship
 * local structural data (monitoringDemo.ts tile/alert types, setupDemo.ts
 * wizard validation), and minimal/forms/records/settings are clean. They are kept as-is; only
 * technical-ribbon is rewritten.
 */
const RIBBON_CLEANUP_TOOLS = ["select", "line", "circle"] as const;

const RIBBON_CLEANUP_DELETED_PATHS = [
  "src/features/technical-ribbon/DemoGeometry.tsx",
  "src/features/technical-ribbon/technicalRibbonTools",
  "src/features/technical-ribbon/technicalRibbonTools/annotateTools.ts",
  "src/features/technical-ribbon/technicalRibbonTools/homeTools.ts",
  "src/features/technical-ribbon/technicalRibbonTools/manageTools.ts",
  "src/features/technical-ribbon/technicalRibbonTools/viewTools.ts",
];

function cleanupReportLines(keptPresets: string[]): string[] {
  const lines: string[] = [];
  if (keptPresets.includes("technical-ribbon")) {
    lines.push(
      "demo cleanup (technical-ribbon): viewport DemoGeometry removed (empty viewport); " +
        "ribbon trimmed to Home/Draw with tools select, line, circle; " +
        "commands trimmed to tool.select, draw.line, draw.circle, grid.toggle; " +
        "widgets trimmed to properties (visible); status trimmed to grid; " +
        `deleted: ${RIBBON_CLEANUP_DELETED_PATHS.join(", ")}`,
    );
  }
  const others = keptPresets.filter((id) => id !== "technical-ribbon");
  if (others.length > 0) {
    lines.push(
      `demo check (${others.join(", ")}): no demo command catalog found by grep ` +
        `(DemoWidgets widget components render structurally; monitoring/setup ` +
        `local Demo data is structural; minimal is clean) — kept as-is.`,
    );
  }
  return lines;
}

function trimmedRibbonText(): string {
  return `import type { RibbonTab } from "../../workbench/types";

    /** Minimal end-to-end ribbon example: one tab (Home), one group (Draw). */
    export const technicalRibbonTabs: RibbonTab[] = [
      {
        id: "home",
        label: "Home",
        groups: [
          {
            id: "draw",
            label: "Draw",
            tools: ["select", "line", "circle"],
          },
        ],
      },
    ];
    `;
}

function trimmedRibbonToolsText(): string {
  return `import { Circle, MousePointer2, Slash } from "lucide-react";
    import { globalTools, type ToolRegistry } from "../../workbench/tools";
    import type { ToolDefinition } from "../../workbench/types";

    /** Minimal end-to-end tool example: select plus two draw tools. */
    export const TECHNICAL_RIBBON_TOOLS: ToolDefinition[] = [
      {
        id: "select",
        label: "Select",
        icon: MousePointer2,
        tooltip: "Select objects",
        command: "tool.select",
        shortcut: "V",
      },
      {
        id: "line",
        label: "Line",
        icon: Slash,
        tooltip: "Draw a line segment",
        command: "draw.line",
        group: "draw",
        shortcut: "L",
      },
      {
        id: "circle",
        label: "Circle",
        icon: Circle,
        tooltip: "Draw a circle",
        command: "draw.circle",
        group: "draw",
        shortcut: "C",
      },
    ];

    export function registerTechnicalRibbonTools(
      registry: ToolRegistry = globalTools,
    ): void {
      for (const tool of TECHNICAL_RIBBON_TOOLS) {
        registry.registerTool(tool);
      }
    }

    /** Rail order for the technical-ribbon preset. */
    export const technicalRibbonRailTools: string[] = ["select", "line", "circle"];
    `;
}

function trimmedRibbonCommandsText(): string {
  return `import { type CommandRegistry, globalCommands } from "../../workbench/commands";
    import { globalStatus, type StatusRegistry } from "../../workbench/status";
    import { globalTools, type ToolRegistry } from "../../workbench/tools";

    /**
     * Selection state owned by the technical-ribbon preset (NOT the core): which
     * tool the last executed tool-command selected. Keyed by registry so tests
     * on fresh registries never pollute (or observe) the shared globals.
     */
    const selectedToolByRegistry = new WeakMap<ToolRegistry, string | null>();
    const listenersByRegistry = new WeakMap<ToolRegistry, Set<() => void>>();

    /** Id of the tool last selected through tools, or null when none was. */
    export function getSelectedTechnicalRibbonToolId(
      tools: ToolRegistry = globalTools,
    ): string | null {
      return selectedToolByRegistry.get(tools) ?? null;
    }

    /**
     * Subscribe to selection changes for tools. Returns an unsubscribe
     * function. No notification fires when the selection is set to its current
     * value, so handlers stay idempotent and re-entrant.
     */
    export function subscribeSelectedTechnicalRibbonToolId(
      tools: ToolRegistry,
      listener: () => void,
    ): () => void {
      let listeners = listenersByRegistry.get(tools);
      if (!listeners) {
        listeners = new Set();
        listenersByRegistry.set(tools, listeners);
      }
      listeners.add(listener);
      return () => {
        listenersByRegistry.get(tools)?.delete(listener);
      };
    }

    function setSelectedTechnicalRibbonToolId(
      tools: ToolRegistry,
      toolId: string,
    ): void {
      if (selectedToolByRegistry.get(tools) === toolId) {
        return;
      }
      selectedToolByRegistry.set(tools, toolId);
      listenersByRegistry.get(tools)?.forEach((notify) => {
        notify();
      });
    }

    /**
     * Anti-loop guard for the ToolProvider bridge: sync only when there is a
     * selection and it differs from the core active tool. Pure so it stays
     * unit-testable without a DOM.
     */
    export function shouldSyncTechnicalRibbonTool(
      selectedToolId: string | null,
      activeToolId: string | null,
    ): boolean {
      return selectedToolId !== null && selectedToolId !== activeToolId;
    }

    /**
     * External-store sync for the preset selection, ready for
     * useSyncExternalStore. The bridge component subscribes through this and
     * calls the core selectTool only when shouldSyncTechnicalRibbonTool
     * passes, so the mount is a no-op when the selection coincides or is null.
     */
    export function getTechnicalRibbonToolSync(tools: ToolRegistry = globalTools): {
      subscribe: (listener: () => void) => () => void;
      getSnapshot: () => string | null;
    } {
      return {
        subscribe: (listener: () => void) =>
          subscribeSelectedTechnicalRibbonToolId(tools, listener),
        getSnapshot: () => getSelectedTechnicalRibbonToolId(tools),
      };
    }

    /**
     * Resolve a command to its tool through the ToolRegistry and record the
     * selection. Resolution is lazy (at execute time) because preset wiring
     * registers commands before tools.
     */
    function selectToolForCommand(commandId: string, tools: ToolRegistry): void {
      const tool = tools.list().find((entry) => entry.command === commandId);
      if (!tool) {
        return;
      }
      setSelectedTechnicalRibbonToolId(tools, tool.id);
    }

    /**
     * Minimal end-to-end command example: one command per tool (selecting it
     * through the ToolRegistry) plus the grid drawing-aid toggle.
     */
    export function registerTechnicalRibbonCommands(
      commands: CommandRegistry = globalCommands,
      status: StatusRegistry = globalStatus,
      tools: ToolRegistry = globalTools,
    ): void {
      const simple: Array<[string, string, string?]> = [
        ["tool.select", "Select", "V"],
        ["draw.line", "Line", "L"],
        ["draw.circle", "Circle", "C"],
      ];
      for (const [id, label, shortcut] of simple) {
        // Idempotent: registerCommand throws on duplicates, and preset wiring
        // runs at import time (hot reloads re-import). First registration wins.
        if (commands.has(id)) {
          continue;
        }
        commands.registerCommand(id, () => selectToolForCommand(id, tools), {
          label,
          shortcut,
        });
      }
      if (!commands.has("grid.toggle")) {
        commands.registerCommand("grid.toggle", () => status.toggle("grid"), {
          label: "Toggle Grid",
          shortcut: "G",
        });
      }
    }
    `;
}

function trimmedRibbonWidgetsText(): string {
  return `import { SlidersHorizontal } from "lucide-react";
    import { PropertiesWidget } from "../../components/workbench/widgets/PropertiesWidget";
    import { globalWidgets, type WidgetRegistry } from "../../workbench/widgets";

    /** Minimal end-to-end widget example: one visible inspector widget. */
    export function registerTechnicalRibbonWidgets(
      registry: WidgetRegistry = globalWidgets,
    ): void {
      registry.registerWidget({
        id: "properties",
        title: "Properties",
        icon: SlidersHorizontal,
        component: PropertiesWidget,
        defaultPosition: "right",
        defaultSize: { width: 220, height: 600 },
        minSize: { width: 180, height: 300 },
        closable: false,
        resizable: true,
        visible: true,
      });
    }
    `;
}

function trimmedRibbonStatusText(): string {
  return `import { globalStatus, type StatusRegistry } from "../../workbench/status";

    /** Minimal end-to-end status example: GRID drives ViewportGrid visibility. */
    export function registerTechnicalRibbonStatus(
      registry: StatusRegistry = globalStatus,
    ): void {
      registry.registerStatusItem({
        id: "grid",
        label: "GRID",
        kind: "toggle",
        active: true,
        shortcut: "G",
      });
    }
    `;
}

/** Trimmed commands test: mirrors the minimal example, never the demo catalog. */
function trimmedRibbonCommandsTestText(): string {
  return `import { describe, expect, it } from "bun:test";
    import { createCommandRegistry } from "../../workbench/commands";
    import { createStatusRegistry } from "../../workbench/status";
    import { createToolRegistry } from "../../workbench/tools";
    import {
      getSelectedTechnicalRibbonToolId,
      getTechnicalRibbonToolSync,
      registerTechnicalRibbonCommands,
      shouldSyncTechnicalRibbonTool,
      subscribeSelectedTechnicalRibbonToolId,
    } from "./technicalRibbonCommands";
    import { registerTechnicalRibbonStatus } from "./technicalRibbonStatus";
    import { registerTechnicalRibbonTools } from "./technicalRibbonTools";

    function setupFresh() {
      const commands = createCommandRegistry();
      const status = createStatusRegistry();
      const tools = createToolRegistry();
      registerTechnicalRibbonTools(tools);
      registerTechnicalRibbonStatus(status);
      registerTechnicalRibbonCommands(commands, status, tools);
      return { commands, status, tools };
    }

    describe("technical ribbon commands (minimal example)", () => {
      it("starts with no tool selected on fresh registries", () => {
        const { tools } = setupFresh();
        expect(getSelectedTechnicalRibbonToolId(tools)).toBeNull();
      });

      it("selects tools when their commands execute", () => {
        const { commands, tools } = setupFresh();
        const cases: Array<[string, string]> = [
          ["tool.select", "select"],
          ["draw.line", "line"],
          ["draw.circle", "circle"],
        ];
        for (const [commandId, toolId] of cases) {
          expect(commands.execute(commandId)).toBe(true);
          expect(getSelectedTechnicalRibbonToolId(tools)).toBe(toolId);
        }
      });

      it("notifies subscribers on selection changes", () => {
        const { commands, tools } = setupFresh();
        const seen: Array<string | null> = [];
        const unsubscribe = subscribeSelectedTechnicalRibbonToolId(tools, () => {
          seen.push(getSelectedTechnicalRibbonToolId(tools));
        });
        commands.execute("draw.line");
        commands.execute("draw.line");
        unsubscribe();
        commands.execute("draw.circle");
        // Second draw.line is idempotent: same value, no second notification.
        expect(seen).toEqual(["line"]);
      });

      it("toggles the grid aid through the status registry", () => {
        const { commands, status } = setupFresh();
        expect(status.isActive("grid")).toBe(true);
        expect(commands.execute("grid.toggle")).toBe(true);
        expect(status.isActive("grid")).toBe(false);
        expect(commands.execute("grid.toggle")).toBe(true);
        expect(status.isActive("grid")).toBe(true);
      });

      it("keeps shortcut metadata on commands and status items", () => {
        const { commands, status } = setupFresh();
        const expected: Array<[string, string]> = [
          ["tool.select", "V"],
          ["draw.line", "L"],
          ["draw.circle", "C"],
          ["grid.toggle", "G"],
        ];
        for (const [commandId, shortcut] of expected) {
          expect(commands.get(commandId)?.shortcut).toBe(shortcut);
        }
        expect(status.get("grid")?.shortcut).toBe("G");
      });

      it("registers idempotently without duplicate-id errors", () => {
        const { commands, status, tools } = setupFresh();
        expect(() =>
          registerTechnicalRibbonCommands(commands, status, tools),
        ).not.toThrow();
        expect(commands.execute("draw.line")).toBe(true);
        expect(getSelectedTechnicalRibbonToolId(tools)).toBe("line");
      });

      it("exposes an external-store sync over the selection", () => {
        const { commands, tools } = setupFresh();
        const sync = getTechnicalRibbonToolSync(tools);
        expect(sync.getSnapshot()).toBeNull();
        const seen: Array<string | null> = [];
        const unsubscribe = sync.subscribe(() => {
          seen.push(sync.getSnapshot());
        });
        commands.execute("draw.line");
        expect(sync.getSnapshot()).toBe("line");
        unsubscribe();
        commands.execute("draw.circle");
        expect(seen).toEqual(["line"]);
      });

      it("guards the ToolProvider bridge against loops", () => {
        // No selection: mount stays a no-op.
        expect(shouldSyncTechnicalRibbonTool(null, "select")).toBe(false);
        expect(shouldSyncTechnicalRibbonTool(null, null)).toBe(false);
        // Selection coincides with the active tool: no selectTool call.
        expect(shouldSyncTechnicalRibbonTool("line", "line")).toBe(false);
        // Selection differs: the bridge syncs once.
        expect(shouldSyncTechnicalRibbonTool("line", "select")).toBe(true);
        expect(shouldSyncTechnicalRibbonTool("line", null)).toBe(true);
      });
    });
    `;
}

/**
 * Apply the technical-ribbon demo cleanup to the STAGING copy. Every
 * rewrite is exact-match guarded: source drift fails loudly instead of
 * shipping a half-trimmed preset that cannot typecheck.
 */
function applyTechnicalRibbonCleanup(staging: string): void {
  const ribbonDir = join(staging, "src", "features", "technical-ribbon");
  for (const file of RIBBON_CLEANUP_DELETED_PATHS) {
    removeDir(join(staging, file));
  }
  if (existsSync(join(ribbonDir, "DemoGeometry.tsx"))) {
    fail("Cleanup failure: DemoGeometry.tsx survived deletion.");
  }
  writeFileSync(
    join(ribbonDir, "technicalRibbonRibbon.ts"),
    trimmedRibbonText(),
  );
  writeFileSync(
    join(ribbonDir, "technicalRibbonTools.ts"),
    trimmedRibbonToolsText(),
  );
  writeFileSync(
    join(ribbonDir, "technicalRibbonCommands.ts"),
    trimmedRibbonCommandsText(),
  );
  writeFileSync(
    join(ribbonDir, "technicalRibbonWidgets.ts"),
    trimmedRibbonWidgetsText(),
  );
  writeFileSync(
    join(ribbonDir, "technicalRibbonStatus.ts"),
    trimmedRibbonStatusText(),
  );
  writeFileSync(
    join(ribbonDir, "technicalRibbonCommands.test.ts"),
    trimmedRibbonCommandsTestText(),
  );
  const layoutPath = join(ribbonDir, "technicalRibbonLayout.tsx");
  let layout = readFileSync(layoutPath, "utf8");
  layout = replaceOrThrow(
    layout,
    `import { DemoGeometry } from "./DemoGeometry";\n`,
    "",
    "cleanup layout DemoGeometry import",
  );
  layout = replaceOrThrow(
    layout,
    [
      "        <Viewport",
      "          onCoordsChange={setCoords}",
      '          scaleLabel="1:1"',
      "          contextMenu={viewportContextMenu}",
      "        >",
      "          <DemoGeometry />",
      "        </Viewport>",
    ].join("\n"),
    [
      "        <Viewport",
      "          onCoordsChange={setCoords}",
      '          scaleLabel="1:1"',
      "          contextMenu={viewportContextMenu}",
      "        />",
    ].join("\n"),
    "cleanup layout DemoGeometry usage",
  );
  // The trimmed command set keeps no view.* commands: the viewport menu
  // reuses the surviving grid toggle only.
  layout = replaceOrThrow(
    layout,
    [
      "const viewportContextMenu: MenuItem[] = [",
      '  { command: "view.zoom-in" },',
      '  { command: "view.zoom-out" },',
      '  { command: "view.reset" },',
      "  { separator: true },",
      '  { command: "grid.toggle" },',
      "];",
    ].join("\n"),
    [
      "// Viewport right-click menu: every entry reuses a registered command",
      "// id (zero duplicated actions). The trimmed example keeps only the",
      "// grid toggle; register more commands to grow this menu.",
      'const viewportContextMenu: MenuItem[] = [{ command: "grid.toggle" }];',
    ].join("\n"),
    "cleanup layout context menu",
  );
  writeFileSync(layoutPath, layout);
  // Containment guards: no demo identifier may survive the cleanup.
  const ribbonFiles = readdirSync(ribbonDir).sort();
  if (ribbonFiles.includes("technicalRibbonTools")) {
    fail("Cleanup failure: technicalRibbonTools/ subdir survived deletion.");
  }
  for (const entry of ribbonFiles) {
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
      continue;
    }
    const content = readFileSync(join(ribbonDir, entry), "utf8");
    for (const leftover of [
      "DemoGeometry",
      "DemoWidgets",
      "annotate.",
      "modify.",
      "layer.",
      "view.",
      "app.",
      "osnap",
      "ortho",
    ]) {
      if (content.includes(leftover)) {
        fail(
          `Cleanup failure: ${entry} still references demo content (${leftover}).`,
        );
      }
    }
  }
  // Coherence guards: every ribbon/rail tool resolves to a def whose
  // command is registered by the trimmed command module.
  const defs = readFileSync(join(ribbonDir, "technicalRibbonTools.ts"), "utf8");
  const commands = readFileSync(
    join(ribbonDir, "technicalRibbonCommands.ts"),
    "utf8",
  );
  for (const tool of RIBBON_CLEANUP_TOOLS) {
    if (!defs.includes(`id: "${tool}"`) || !defs.includes("command:")) {
      fail(`Cleanup failure: tool def "${tool}" is missing a command.`);
    }
  }
  for (const command of [
    '"tool.select"',
    '"draw.line"',
    '"draw.circle"',
    '"grid.toggle"',
  ]) {
    if (!commands.includes(command)) {
      fail(`Cleanup failure: command ${command} is not registered.`);
    }
  }
}

function pruneStagingToMinimal(
  staging: string,
  projectName: string,
  keptPresets: string[],
  theme: string,
  options: {
    appName: string;
    withFeatures: string[];
    withoutFeatures: string[];
    resolvedFeatures: string[];
  },
): void {
  const primary = keptPresets[0];
  const featuresDir = join(staging, "src", "features");
  for (const dir of [...PRESET_FEATURE_DIRS, ...VIEWPORT_FREE_PRESET_DIRS]) {
    if (!keptPresets.includes(dir)) {
      removeDir(join(featuresDir, dir));
    }
  }
  removeDir(join(featuresDir, "showcase"));
  for (const kept of keptPresets) {
    if (!existsSync(join(featuresDir, kept))) {
      fail(`Prune failure: kept preset dir "src/features/${kept}" is missing.`);
    }
  }
  // Guard: no kept preset may import pruned showcase code. Per the
  // file strategy above this never triggers on the current source; it
  // fails loudly instead of shipping a derived project that cannot typecheck.
  for (const kept of keptPresets) {
    for (const entry of readdirSync(join(featuresDir, kept)).sort()) {
      if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
        continue;
      }
      const content = readFileSync(join(featuresDir, kept, entry), "utf8");
      if (content.includes("features/showcase")) {
        fail(
          `Prune failure: kept preset "${kept}" imports showcase code (${entry}); add a staging rewrite for it.`,
        );
      }
    }
  }
  // Clean-by-default demo cleanup (staging only, never the source).
  if (keptPresets.includes("technical-ribbon")) {
    applyTechnicalRibbonCleanup(staging);
  }
  const themesDir = join(staging, "src", "styles", "themes");
  for (const entry of readdirSync(themesDir).sort()) {
    if (entry.endsWith(".css") && entry !== `${theme}.css`) {
      removeDir(join(themesDir, entry));
    }
  }
  if (!existsSync(join(themesDir, `${theme}.css`))) {
    fail(
      `Prune failure: kept theme "src/styles/themes/${theme}.css" is missing.`,
    );
  }
  const routerPath = join(staging, "src", "app", "router.tsx");
  writeFileSync(
    routerPath,
    pruneRouterText(readFileSync(routerPath, "utf8"), keptPresets),
  );
  const globalCssPath = join(staging, "src", "styles", "global.css");
  writeFileSync(
    globalCssPath,
    pruneGlobalCssText(readFileSync(globalCssPath, "utf8"), theme),
  );
  writeFileSync(
    join(themesDir, "theme-parity.test.ts"),
    prunedThemeParityTest(),
  );
  writeFileSync(
    join(staging, "src", "workbench", "presets.test.ts"),
    prunedPresetsTest(keptPresets),
  );
  writeFileSync(
    join(staging, "src", "app", "workbench.config.test.ts"),
    prunedWorkbenchConfigTest(keptPresets, theme),
  );
  writeFileSync(
    join(staging, "scripts", "ai-context.test.ts"),
    prunedAiContextTest(projectName, keptPresets, theme),
  );
  const archPath = join(staging, "scripts", "validate-architecture.ts");
  writeFileSync(
    archPath,
    pruneValidateArchitectureText(readFileSync(archPath, "utf8"), primary),
  );
  // Replace the factory README with the derived app README.
  writeFileSync(
    join(staging, "README.md"),
    renderDerivedReadme({
      appName: options.appName,
      preset: primary,
      keptPresets,
      theme,
      withFeatures: options.withFeatures,
      withoutFeatures: options.withoutFeatures,
      resolvedFeatures: options.resolvedFeatures,
    }),
  );
}

function parseListFlag(
  values: string[],
  flag: string,
  known: string[],
): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!known.includes(value)) {
      fail(
        `Unknown feature id in "--${flag}": "${value}". Known features: ${known.join(", ")}.`,
      );
    }
    if (!out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}

function parsePresetListFlag(values: string[], known: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!known.includes(value)) {
      fail(
        `Unknown preset in "--with-presets": "${value}". Known presets: ${known.join(", ")}.`,
      );
    }
    if (!out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (printHelpIfRequested(argv, SCRIPT, spec, EXAMPLES)) {
    return;
  }
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv, spec);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const repoRoot = validateRepoRoot();
  const model = await loadModel(repoRoot);

  const rawName = parsed.positionals[0];
  if (!rawName) {
    fail(
      "Missing project <name>. Example: bun run generate:project -- my-app --preset minimal.",
    );
  }
  const projectName = toKebab(rawName);
  if (projectName === "") {
    fail(`Invalid project name: "${rawName}".`);
  }
  const preset = str(parsed, "preset") ?? "technical-ribbon";
  if (!model.presets.has(preset)) {
    fail(
      `Unknown preset "${preset}". Known presets: ${model.presetIds.join(", ")}.`,
    );
  }
  // Extra presets to keep (repeatable/comma, validated against real ids).
  // The prune keeps the manifest preset plus these; without the flag the
  // derived project ships a single preset, as before.
  const withPresets = parsePresetListFlag(
    list(parsed, "with-presets"),
    model.presetIds,
  );
  const keptPresets = [preset, ...withPresets.filter((id) => id !== preset)];
  const theme = str(parsed, "theme") ?? "ocstudio";
  if (!model.themes.includes(theme)) {
    fail(`Unknown theme "${theme}". Known themes: ${model.themes.join(", ")}.`);
  }
  const withFeatures = parseListFlag(
    list(parsed, "with"),
    "with",
    model.features,
  );
  const withoutFeatures = parseListFlag(
    list(parsed, "without"),
    "without",
    model.features,
  );
  const overlap = withFeatures.filter((f) => withoutFeatures.includes(f));
  if (overlap.length > 0) {
    fail(`Feature(s) in both --with and --without: ${overlap.join(", ")}.`);
  }
  // Fail fast on incoherent combinations (load-bearing, hosting) BEFORE writing.
  let resolved: string[];
  try {
    resolved = model.resolveOrThrow(preset, {
      with: withFeatures,
      without: withoutFeatures,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  const appName = str(parsed, "app-name") ?? toTitle(projectName);
  const destArg = str(parsed, "dest") ?? join("..", projectName);
  const dest = resolve(process.cwd(), destArg);
  const force = bool(parsed, "force");
  const dryRun = bool(parsed, "dry-run");

  if (dryRun) {
    console.log(`Dry run: project "${projectName}" -> ${dest}`);
    console.log(`  preset: ${preset}  theme: ${theme}  appName: ${appName}`);
    console.log(
      `  with: [${withFeatures.join(", ")}]  without: [${withoutFeatures.join(", ")}]`,
    );
    console.log(`  resolved features: ${resolved.join(", ")}`);
    console.log(`  source-only excluded: ${[...SOURCE_ONLY].join(", ")}`);
    console.log(prunePlanReport(keptPresets, theme, model.themes));
    return;
  }

  // Destination policy: never destroy arbitrary dirs. --force only replaces
  // a destination carrying a valid marker from THIS template.
  if (isNonEmptyDir(dest)) {
    if (!force) {
      fail(
        `Destination "${dest}" already exists and is not empty. Pass --force only to replace a generated project.`,
      );
    }
    const markerPath = join(dest, MARKER_FILE);
    if (!existsSync(markerPath)) {
      fail(
        `Refusing --force on "${dest}": no ${MARKER_FILE} marker (not a generated project).`,
      );
    }
    let marker: BoilerplateMarker;
    try {
      marker = readJson<BoilerplateMarker>(markerPath);
    } catch {
      fail(`Refusing --force on "${dest}": ${MARKER_FILE} is not valid JSON.`);
    }
    if (
      marker.template !== TEMPLATE_ID ||
      typeof marker.schemaVersion !== "number"
    ) {
      fail(
        `Refusing --force on "${dest}": marker template is "${marker.template}", expected "${TEMPLATE_ID}".`,
      );
    }
    removeDir(dest);
  }

  const staging = join(
    dirname(dest),
    `.scaffold-staging-${projectName}-${process.pid}`,
  );
  if (existsSync(staging)) {
    removeDir(staging);
  }
  try {
    copySourceToStaging(repoRoot, staging);

    // Identity transform: package.json.
    const stagedPkgPath = join(staging, "package.json");
    const stagedPkg = readJson<Record<string, unknown>>(stagedPkgPath);
    stagedPkg.name = projectName;
    stagedPkg.description = `Derived from ${TEMPLATE_ID} (preset ${preset}, theme ${theme}).`;
    const scripts = stagedPkg.scripts as Record<string, string>;
    delete scripts["generate:project"];
    // The scaffolding self-test materializes projects; its script file
    // is pruned above, so its package.json entry must go too.
    delete scripts["self-test:scaffolding"];
    writeFileSync(stagedPkgPath, `${JSON.stringify(stagedPkg, null, 2)}\n`);

    // Config transform: workbench manifest for the derived app.
    writeFileSync(
      join(staging, "src", "app", "workbench.config.ts"),
      renderWorkbenchConfig({
        appName,
        layout: preset,
        keptPresets,
        theme,
        withFeatures,
        withoutFeatures,
      }),
    );

    // Minimal derived project: prune unchosen presets/showcase/themes
    // and rewrite catalog enumerations (staging only, never the source).
    pruneStagingToMinimal(staging, projectName, keptPresets, theme, {
      appName,
      withFeatures,
      withoutFeatures,
      resolvedFeatures: resolved,
    });

    // Provenance marker.
    const marker: BoilerplateMarker = {
      schemaVersion: 1,
      template: TEMPLATE_ID,
      sourceVersion: model.sourceVersion,
      sourceCommit: model.sourceCommit,
      preset,
      presets: keptPresets,
      theme,
    };
    writeFileSync(
      join(staging, MARKER_FILE),
      `${JSON.stringify(marker, null, 2)}\n`,
    );

    ensureDir(dirname(dest));
    renameSync(staging, dest);
  } catch (error) {
    removeDir(staging);
    fail(error instanceof Error ? error.message : String(error));
  }

  if (bool(parsed, "install")) {
    try {
      execSync("bun install", { cwd: dest, stdio: "inherit" });
    } catch {
      fail(`"bun install" failed in "${dest}".`);
    }
  }
  if (bool(parsed, "git")) {
    try {
      execSync("git init", { cwd: dest, stdio: "inherit" });
    } catch {
      fail(`"git init" failed in "${dest}".`);
    }
  }

  // The copied generated-context.md still describes the boilerplate:
  // regenerate it so it describes the derived application.
  try {
    execSync("bun run ai:context", { cwd: dest, stdio: "inherit" });
  } catch {
    fail(`"bun run ai:context" failed in "${dest}".`);
  }

  console.log(`Project "${projectName}" materialized at ${dest}`);
  console.log(
    `  presets: ${keptPresets.join(", ")}  theme: ${theme}  features: ${resolved.join(", ")}`,
  );
  for (const line of cleanupReportLines(keptPresets)) {
    console.log(`  ${line}`);
  }
  console.log(`AI context regenerated in the derived project.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
