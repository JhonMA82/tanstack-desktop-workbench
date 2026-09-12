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
import { toKebab, toTitle } from "./_lib/naming";
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
  theme: string;
  withFeatures: string[];
  withoutFeatures: string[];
}): string {
  // Minimal derived project: the manifest names exactly one preset and one
  // theme (the pruned catalog). The boilerplate source keeps the full
  // unions; only staging copies are rewritten here.
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
    `export type WorkbenchLayoutId = "{{LAYOUT}}";`,
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
    THEME: options.theme,
    WITH_LINE: withLine,
    WITHOUT_LINE: withoutLine,
  });
}

/**
 * Minimal-derived-project pruning. ALL of this runs on STAGING copies;
 * the boilerplate source is never modified (it keeps all 7 presets and
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
 *   registration) is mapped explicitly in PRESET_ROUTER_WIRING; the
 *   staging router is rewritten to the single kept entry.
 */
const PRESET_FEATURE_DIRS = [
  "technical-ribbon",
  "ide",
  "studio",
  "operator",
  "minimal",
  "monitoring",
  "setup",
] as const;

const PRESET_ROUTER_WIRING: Record<
  string,
  { component: string; componentFrom: string; presetSideEffect: string }
> = {
  "technical-ribbon": {
    component: "TechnicalRibbonPage",
    componentFrom: "../features/technical-ribbon/TechnicalRibbonPage",
    presetSideEffect: "../features/technical-ribbon/technicalRibbonLayout",
  },
  ide: {
    component: "IdeWorkbench",
    componentFrom: "../features/ide/IdeWorkbench",
    presetSideEffect: "../features/ide/idePreset",
  },
  studio: {
    component: "StudioWorkbench",
    componentFrom: "../features/studio/StudioWorkbench",
    presetSideEffect: "../features/studio/studioPreset",
  },
  operator: {
    component: "OperatorWorkbench",
    componentFrom: "../features/operator/OperatorWorkbench",
    presetSideEffect: "../features/operator/operatorPreset",
  },
  monitoring: {
    component: "MonitoringWorkbench",
    componentFrom: "../features/monitoring/MonitoringWorkbench",
    presetSideEffect: "../features/monitoring/monitoringPreset",
  },
  setup: {
    component: "SetupWorkbench",
    componentFrom: "../features/setup/SetupWorkbench",
    presetSideEffect: "../features/setup/setupPreset",
  },
  minimal: {
    component: "MinimalWorkbench",
    componentFrom: "../features/minimal/MinimalWorkbench",
    presetSideEffect: "../features/minimal/minimalPreset",
  },
};

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
  preset: string,
  theme: string,
  knownThemes: string[],
): { featureDirs: string[]; themeFiles: string[] } {
  return {
    featureDirs: [
      ...PRESET_FEATURE_DIRS.filter((dir) => dir !== preset).map(
        (dir) => `src/features/${dir}`,
      ),
      "src/features/showcase",
    ],
    themeFiles: knownThemes
      .filter((id) => id !== theme)
      .map((id) => `src/styles/themes/${id}.css`),
  };
}

function prunePlanReport(
  preset: string,
  theme: string,
  knownThemes: string[],
): string {
  const plan = prunePlan(preset, theme, knownThemes);
  return [
    `  prune features: ${plan.featureDirs.join(", ")} (keep src/features/${preset} + custom feature dirs)`,
    `  prune themes: ${plan.themeFiles.join(", ") || "(none)"} (keep src/styles/themes/${theme}.css)`,
    `  rewrite: ${PRUNED_REWRITES.join(", ")}`,
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

/** Rewrite the staging router to the single kept preset (no preview/demo chrome). */
function pruneRouterText(source: string, preset: string): string {
  const wiring = PRESET_ROUTER_WIRING[preset];
  if (!wiring) {
    fail(`Prune failure: no router wiring for preset "${preset}".`);
  }
  let out = source;
  out = replaceOrThrow(
    out,
    `import { ControlsShowcase } from "../features/showcase/ControlsShowcase";\n`,
    "",
    "router showcase import",
  );
  for (const [id, entry] of Object.entries(PRESET_ROUTER_WIRING)) {
    if (id === preset) {
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
  out = replaceOrThrow(
    out,
    /const presetComponents: Record<string, PresetComponent> = \{[^}]*\};/,
    `const presetComponents: Record<string, PresetComponent> = {\n  "${preset}": ${wiring.component},\n};`,
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
  // The /presets/$presetId route makes no sense with a single preset.
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
  // + ErrorBoundary + direct Outlet) and the single kept preset route.
  for (const marker of ["<Outlet />", "ErrorBoundary", `"${preset}"`]) {
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
 * Side-effect import that registers the kept preset in a staging test.
 * Both staging test locations (`src/workbench/*` and `src/app/*`) address
 * features as `../features/...`, mirroring PRESET_ROUTER_WIRING.
 */
function presetSideEffectImport(preset: string): string {
  const wiring = PRESET_ROUTER_WIRING[preset];
  if (!wiring) {
    fail(`Prune failure: no router wiring for preset "${preset}".`);
  }
  return `import "${wiring.presetSideEffect}";`;
}

/** Pruned catalog test: only the kept preset is registered and coherent. */
function prunedPresetsTest(preset: string): string {
  return `import { describe, expect, it } from "bun:test";
${presetSideEffectImport(preset)}
import { resolveFeaturesOrThrow } from "./features";
import { globalPresets } from "./layouts";

/**
 * Preset catalog (pruned derived project): only the "${preset}" preset
 * ships. The boilerplate source asserts all seven presets; only staging
 * copies are rewritten here.
 */
describe("preset catalog (pruned)", () => {
  it("registers the kept preset", () => {
    expect(globalPresets.has("${preset}")).toBe(true);
  });

  it("resolves the kept preset defaults without errors", () => {
    const kept = globalPresets.get("${preset}");
    if (!kept) {
      throw new Error('Kept preset "${preset}" is not registered');
    }
    const features = resolveFeaturesOrThrow(kept);
    expect(features).toContain("viewport");
  });
});
`;
}

/** Pruned manifest test: asserts the kept preset+theme, never technical-ribbon. */
function prunedWorkbenchConfigTest(preset: string, theme: string): string {
  return `import { describe, expect, it } from "bun:test";
${presetSideEffectImport(preset)}
import { resolveFeaturesOrThrow } from "../workbench/features";
import { globalPresets } from "../workbench/layouts";
import { workbenchConfig } from "./workbench.config";

/**
 * Workbench manifest (pruned derived project): the manifest names the kept
 * preset "${preset}" and theme "${theme}". The boilerplate source pins
 * technical-ribbon; only staging copies are rewritten here.
 */
describe("workbench manifest (pruned)", () => {
  it("declares the kept layout", () => {
    expect(workbenchConfig.layout).toBe("${preset}");
  });

  it("declares the kept theme", () => {
    expect(workbenchConfig.theme).toBe("${theme}");
  });

  it("resolves the manifest layout to a registered preset", () => {
    const kept = globalPresets.get(workbenchConfig.layout);
    expect(kept).toBeDefined();
    expect(kept?.id).toBe("${preset}");
  });

  it("resolves the manifest features without errors", () => {
    const kept = globalPresets.get(workbenchConfig.layout);
    if (!kept) {
      throw new Error("Manifest preset is not registered");
    }
    const features = resolveFeaturesOrThrow(kept, workbenchConfig);
    expect(features).toContain("viewport");
  });
});
`;
}

/**
 * Prune staging to the minimal derived project: delete unchosen preset
 * dirs + showcase, delete unchosen theme files, rewrite the catalog
 * enumerations. Custom `src/features/*` dirs (app extensions created via
 * generate:feature) are KEPT: only the seven known preset dirs and
 * showcase are ever removed.
 */
/**
 * Pruned ai:context snapshot test: asserts the DERIVED catalog (project
 * name, kept preset+theme) instead of the boilerplate's full catalog.
 * Determinism/generated-marker/check tests are kept verbatim.
 */
function prunedAiContextTest(
  projectName: string,
  preset: string,
  theme: string,
): string {
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
    expect(snapshot.preset).toBe("${preset}");
    expect(snapshot.theme).toBe("${theme}");
    expect(snapshot.presetIds).toEqual(["${preset}"]);
    expect(snapshot.themes).toEqual(["${theme}"]);
    expect(snapshot.resolvedFeatures).toContain("viewport");
    // Registry content ships with preset files: only technical-ribbon carries
    // demo widget/command/tool/status registrations, so other derived
    // catalogs legitimately list none. Assert structure, not demo content.
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
  theme: string;
  withFeatures: string[];
  withoutFeatures: string[];
  resolvedFeatures: string[];
}): string {
  const lines = [
    `# ${options.appName}`,
    ``,
    `${options.appName} is a desktop-style workbench application.`,
    ``,
    `## Configuration`,
    ``,
    `- Preset: \`${options.preset}\``,
    `- Theme: \`${options.theme}\``,
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
    ``,
    `## Docs`,
    ``,
    `- \`docs/scaffolding.md\` — how the kept extension generators work`,
    `- \`docs/ai/generated-context.md\` — generated snapshot of this app (do not edit manually)`,
    ``,
  ];
  return lines.join("\n");
}

function pruneStagingToMinimal(
  staging: string,
  projectName: string,
  preset: string,
  theme: string,
  options: {
    appName: string;
    withFeatures: string[];
    withoutFeatures: string[];
    resolvedFeatures: string[];
  },
): void {
  const featuresDir = join(staging, "src", "features");
  for (const dir of PRESET_FEATURE_DIRS) {
    if (dir !== preset) {
      removeDir(join(featuresDir, dir));
    }
  }
  removeDir(join(featuresDir, "showcase"));
  if (!existsSync(join(featuresDir, preset))) {
    fail(`Prune failure: kept preset dir "src/features/${preset}" is missing.`);
  }
  // Guard: the kept preset must not import pruned showcase code. Per the
  // file strategy above this never triggers on the current source; it
  // fails loudly instead of shipping a derived project that cannot typecheck.
  for (const entry of readdirSync(join(featuresDir, preset)).sort()) {
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
      continue;
    }
    const content = readFileSync(join(featuresDir, preset, entry), "utf8");
    if (content.includes("features/showcase")) {
      fail(
        `Prune failure: kept preset "${preset}" imports showcase code (${entry}); add a staging rewrite for it.`,
      );
    }
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
    pruneRouterText(readFileSync(routerPath, "utf8"), preset),
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
    prunedPresetsTest(preset),
  );
  writeFileSync(
    join(staging, "src", "app", "workbench.config.test.ts"),
    prunedWorkbenchConfigTest(preset, theme),
  );
  writeFileSync(
    join(staging, "scripts", "ai-context.test.ts"),
    prunedAiContextTest(projectName, preset, theme),
  );
  const archPath = join(staging, "scripts", "validate-architecture.ts");
  writeFileSync(
    archPath,
    pruneValidateArchitectureText(readFileSync(archPath, "utf8"), preset),
  );
  // Replace the factory README with the derived app README.
  writeFileSync(
    join(staging, "README.md"),
    renderDerivedReadme({
      appName: options.appName,
      preset,
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
    console.log(prunePlanReport(preset, theme, model.themes));
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
        theme,
        withFeatures,
        withoutFeatures,
      }),
    );

    // Minimal derived project: prune unchosen presets/showcase/themes
    // and rewrite catalog enumerations (staging only, never the source).
    pruneStagingToMinimal(staging, projectName, preset, theme, {
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
    `  preset: ${preset}  theme: ${theme}  features: ${resolved.join(", ")}`,
  );
  console.log(`AI context regenerated in the derived project.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
