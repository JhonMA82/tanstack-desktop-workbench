#!/usr/bin/env bun
/**
 * Generate the AI context snapshot from the real repository state.
 *
 * Reads package.json, workbench.config.ts, the preset modules found by
 * globbing *Preset.ts, the feature registry, and the registered
 * widgets/commands/tools/status items found in the sources. Writes the
 * compact snapshot to docs/ai/generated-context.md with a deterministic
 * digest; `--check` regenerates in memory and fails when the file drifts.
 */
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bool,
  type CommandSpec,
  fail,
  type ParsedArgs,
  parseArgs,
  printHelpIfRequested,
} from "./_lib/cli";
import { ensureDir, exists, readJson, readText, writeFile } from "./_lib/files";

const SCRIPT = "ai:context";
const OUTPUT = "docs/ai/generated-context.md";
const STALE_MESSAGE = `${OUTPUT} is stale. Run bun run ai:context and commit the result.`;

const spec: CommandSpec = {
  name: "ai:context",
  description:
    "Generate docs/ai/generated-context.md from the real repo state (--check fails on drift).",
  flags: [
    {
      name: "check",
      description: "Regenerate in memory and fail when the file drifts",
      boolean: true,
    },
  ],
};

const EXAMPLES = ["bun run ai:context", "bun run ai:context:check"];

interface PresetSummary {
  id: string;
  label: string;
  defaultFeatures: string[];
}

interface RibbonGroupSummary {
  id: string;
  tools: string[];
}

interface RibbonTabSummary {
  id: string;
  label: string;
  groups: RibbonGroupSummary[];
}

interface WidgetSummary {
  id: string;
  title: string;
  dock: string;
  visible: boolean;
}

/** Structural patterns discovered in a preset directory (never hardcoded). */
interface PresetPattern {
  id: string;
  /** Repo-relative preset directory, derived from the *Preset.ts file. */
  dir: string;
  presetFile: string;
  slots: Record<string, string[]>;
  defaultFeatures: string[];
  ribbonFile?: string;
  ribbonTabs?: RibbonTabSummary[];
  toolsFile?: string;
  railTools?: string[];
  toolDefCount?: number;
  toolsDir?: string;
  toolPartFiles?: string[];
  widgetsFile?: string;
  widgets?: WidgetSummary[];
  statusFile?: string;
  statusIds?: string[];
  commandsFile?: string;
  commandIds?: string[];
  shellFiles?: string[];
}

interface AiSnapshot {
  packageName: string;
  packageVersion: string;
  projectKind: string;
  stack: string[];
  appName: string;
  preset: string;
  theme: string;
  withFeatures: string[];
  withoutFeatures: string[];
  resolvedFeatures: string[];
  knownCoreFeatures: string[];
  customFeatures: string[];
  presetIds: string[];
  presets: PresetSummary[];
  presetPatterns: PresetPattern[];
  themes: string[];
  themeFiles: string[];
  widgets: string[];
  commands: string[];
  tools: string[];
  statusItems: string[];
  controls: ControlEntry[];
  relevantScripts: string[];
  templates: string;
}

function isPresetLike(value: unknown): value is {
  id: string;
  label?: string;
  defaultFeatures?: unknown;
} {
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

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function listSourceFiles(srcDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(srcDir);
  return out;
}

function extractIds(
  repoRoot: string,
  fileMatcher: (content: string) => boolean,
  idPattern: RegExp,
): string[] {
  const found: string[] = [];
  const srcDir = join(repoRoot, "src");
  if (!exists(srcDir)) {
    return found;
  }
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
      continue;
    }
    const content = readText(file);
    if (!fileMatcher(content)) {
      continue;
    }
    for (const match of content.matchAll(idPattern)) {
      const id = match[1];
      // Skip template placeholders (e.g. id: "${def.id}") in registry code:
      // only concrete kebab/dotted ids describe the real registrations.
      if (id && !/[$`\s]/.test(id)) {
        found.push(id);
      }
    }
  }
  return sortedUnique(found);
}

function extractCustomFeatures(repoRoot: string): string[] {
  const byConst = extractIds(
    repoRoot,
    (content) => content.includes("registerFeature"),
    /\b\w+FeatureId\s*=\s*"([^"]+)"/g,
  );
  const byLiteral = extractIds(
    repoRoot,
    (content) => content.includes("registerFeature"),
    /registerFeature\(\s*\{\s*id:\s*"([^"]+)"/g,
  );
  return sortedUnique([...byConst, ...byLiteral]);
}

function extractCommandIds(repoRoot: string): string[] {
  const direct = extractIds(
    repoRoot,
    (content) => content.includes("registerCommand"),
    /registerCommand\(\s*"([^"]+)"/g,
  );
  const table = extractIds(
    repoRoot,
    (content) => content.includes("registerCommand"),
    /\["([\w][\w.:~-]*)",\s*"[^"]*"/g,
  );
  return sortedUnique([...direct, ...table]);
}

type ControlFamily =
  | "forms"
  | "tables"
  | "overlays"
  | "feedback"
  | "layout"
  | "other";

interface ControlEntry {
  family: ControlFamily;
  name: string;
  file: string;
  purpose: string;
}

/**
 * Heuristic family for a primitives module, derived from its file name
 * (never from a fixed control list, so derived projects keep working
 * without code changes when the library grows).
 */
function familyForPrimitiveFile(base: string): ControlFamily {
  const name = base.toLowerCase();
  if (/table|column|grid/.test(name)) {
    return "tables";
  }
  if (/dialog|menu|modal|popover|overlay|trigger/.test(name)) {
    return "overlays";
  }
  if (/badge|skeleton|loading|empty|error|toast|status|state/.test(name)) {
    return "feedback";
  }
  if (
    /field|input|toggle|button|slider|checkbox|radio|switch|select|textarea/.test(
      name,
    )
  ) {
    return "forms";
  }
  if (/panel|separator|property|section|layout/.test(name)) {
    return "layout";
  }
  return "other";
}

/** First JSDoc line of the docblock immediately above an export. */
function purposeOfExport(content: string, exportIndex: number): string {
  const before = content.slice(0, exportIndex);
  const blocks = [...before.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
  const last = blocks[blocks.length - 1];
  if (!last || last.index === undefined) {
    return "";
  }
  // Only the docblock directly attached to the export counts: anything but
  // whitespace between the block end and the export means it documents
  // something else (a type, the previous export, ...).
  if (before.slice(last.index + last[0].length).trim().length > 0) {
    return "";
  }
  const firstLine =
    last[1]
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .find((line) => line.length > 0) ?? "";
  return firstLine.replace(/\s+/g, " ").trim();
}

/**
 * Inventory every component exported by
 * src/components/workbench/primitives/*.tsx (glob + real exports, no
 * fixed lists). Purpose comes from the export's JSDoc comment, falling
 * back to a family label derived from the file name.
 */
function discoverControls(repoRoot: string): ControlEntry[] {
  const dir = join(repoRoot, "src", "components", "workbench", "primitives");
  let entries: string[];
  try {
    entries = readdirSync(dir)
      .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
      .sort();
  } catch {
    return [];
  }
  const out: ControlEntry[] = [];
  for (const file of entries) {
    const family = familyForPrimitiveFile(file);
    const content = readText(join(dir, file));
    const pattern = /^export\s+(?:function|class|const)\s+([A-Za-z0-9_]+)/gm;
    for (const match of content.matchAll(pattern)) {
      const name = match[1];
      if (name.startsWith("_")) {
        continue;
      }
      out.push({
        family,
        name,
        file,
        purpose:
          purposeOfExport(content, match.index ?? 0) ||
          `Shared ${family} primitive.`,
      });
    }
  }
  const order: ControlFamily[] = [
    "forms",
    "tables",
    "overlays",
    "feedback",
    "layout",
    "other",
  ];
  return out.sort(
    (a, b) =>
      order.indexOf(a.family) - order.indexOf(b.family) ||
      a.name.localeCompare(b.name),
  );
}

function isRibbonTabArray(value: unknown): value is Array<{
  id: string;
  label?: unknown;
  groups: Array<{ id: string; tools: unknown }>;
}> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === "string" && Array.isArray(candidate.groups)
      );
    })
  );
}

function isToolDefLike(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" && typeof candidate.command === "string"
  );
}

async function importPresetModule(
  absPath: string,
): Promise<Record<string, unknown> | null> {
  try {
    return (await import(absPath)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Invoke every exported `register*` function with a stub registry that
 * captures `registerX(firstArg)` calls. Never touches the real globals:
 * the stub answers any other method with a no-op.
 */
function captureRegistrations(
  registerFn: (...args: never[]) => void,
): Map<string, unknown[]> {
  const captured = new Map<string, unknown[]>();
  const stub = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === "string" && prop.startsWith("register")) {
          return (first: unknown) => {
            const list = captured.get(prop) ?? [];
            list.push(first);
            captured.set(prop, list);
          };
        }
        return () => undefined;
      },
    },
  );
  registerFn(stub as never, stub as never, stub as never);
  return captured;
}

function asWidgetSummaries(raw: unknown[] | undefined): WidgetSummary[] {
  const out: WidgetSummary[] = [];
  for (const item of raw ?? []) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string") {
      continue;
    }
    out.push({
      id: candidate.id,
      title:
        typeof candidate.title === "string" ? candidate.title : candidate.id,
      dock:
        typeof candidate.defaultPosition === "string"
          ? candidate.defaultPosition
          : "?",
      visible: candidate.visible === true,
    });
  }
  return out;
}

function asIdList(raw: unknown[] | undefined): string[] {
  const out: string[] = [];
  for (const item of raw ?? []) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === "string"
    ) {
      out.push((item as Record<string, unknown>).id as string);
    }
  }
  return [...new Set(out)];
}

function asCommandList(raw: unknown[] | undefined): string[] {
  const out: string[] = [];
  for (const item of raw ?? []) {
    if (typeof item === "string" && !/[$`\s]/.test(item)) {
      out.push(item);
    }
  }
  return [...new Set(out)];
}

/**
 * Discover the structural pattern modules of one preset by globbing its own
 * directory (derived from the *Preset.ts file, never from a fixed list):
 * *Ribbon.ts, *Tools.ts (+ a *Tools/ part dir), *Widgets.ts, *Status.ts,
 * *Commands.ts, and *Workbench.tsx/*Layout.tsx/*Page.tsx shell files.
 * Data modules are read via dynamic import; register* functions are invoked
 * with a capturing stub so the snapshot reflects real exports.
 */
async function discoverPresetPatterns(
  repoRoot: string,
  preset: { id: string; slots: unknown; defaultFeatures: string[] },
  presetAbsFile: string,
): Promise<PresetPattern> {
  const dir = dirname(presetAbsFile);
  const relDir = relative(repoRoot, dir);
  const pattern: PresetPattern = {
    id: preset.id,
    dir: relDir,
    presetFile: basename(presetAbsFile),
    slots: (preset.slots ?? {}) as Record<string, string[]>,
    defaultFeatures: [...preset.defaultFeatures],
  };
  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .map((entry) => entry.name)
      .sort();
  } catch {
    return pattern;
  }
  const pick = (suffix: string): string | undefined =>
    entries.find((name) => name.endsWith(suffix) && !name.endsWith(".test.ts"));
  const ribbonName = pick("Ribbon.ts");
  const toolsName = pick("Tools.ts");
  const widgetsName = pick("Widgets.ts");
  const statusName = pick("Status.ts");
  const commandsName = pick("Commands.ts");
  // A *Preset.ts file also ends with "et.ts", never with the suffixes
  // above, so no exclusion is needed beyond the test-file guard.
  if (ribbonName && ribbonName !== pattern.presetFile) {
    pattern.ribbonFile = ribbonName;
    const mod = await importPresetModule(join(dir, ribbonName));
    if (mod) {
      for (const exported of Object.values(mod)) {
        if (isRibbonTabArray(exported)) {
          pattern.ribbonTabs = exported.map((tab) => ({
            id: tab.id,
            label: typeof tab.label === "string" ? tab.label : tab.id,
            groups: tab.groups
              .filter(
                (group): group is { id: string; tools: unknown } =>
                  typeof group === "object" &&
                  group !== null &&
                  typeof group.id === "string",
              )
              .map((group) => ({
                id: group.id,
                tools: Array.isArray(group.tools)
                  ? group.tools.filter(
                      (tool): tool is string => typeof tool === "string",
                    )
                  : [],
              })),
          }));
          break;
        }
      }
    }
  }
  if (toolsName) {
    pattern.toolsFile = toolsName;
    const mod = await importPresetModule(join(dir, toolsName));
    if (mod) {
      for (const exported of Object.values(mod)) {
        if (!Array.isArray(exported) || exported.length === 0) {
          continue;
        }
        if (exported.every((item) => typeof item === "string")) {
          pattern.railTools = [...new Set(exported as string[])];
        } else if (exported.every(isToolDefLike)) {
          pattern.toolDefCount = (pattern.toolDefCount ?? 0) + exported.length;
        }
      }
    }
    const toolsDirName = entries.find((name) => {
      if (name === toolsName || !name.endsWith("Tools")) {
        return false;
      }
      try {
        return readdirSync(join(dir, name), { withFileTypes: true }).some(
          (entry) => entry.isFile(),
        );
      } catch {
        return false;
      }
    });
    if (toolsDirName) {
      pattern.toolsDir = toolsDirName;
      try {
        pattern.toolPartFiles = readdirSync(join(dir, toolsDirName))
          .filter((name) => name.endsWith(".ts"))
          .sort()
          .map((name) => name.replace(/\.ts$/, ""));
      } catch {
        pattern.toolPartFiles = [];
      }
    }
  }
  const captureFrom = async (
    fileName: string | undefined,
  ): Promise<Map<string, unknown[]>> => {
    const merged = new Map<string, unknown[]>();
    if (!fileName) {
      return merged;
    }
    const mod = await importPresetModule(join(dir, fileName));
    if (!mod) {
      return merged;
    }
    for (const [name, exported] of Object.entries(mod)) {
      if (typeof exported !== "function" || !name.startsWith("register")) {
        continue;
      }
      try {
        for (const [key, values] of captureRegistrations(
          exported as (...args: never[]) => void,
        )) {
          merged.set(key, [...(merged.get(key) ?? []), ...values]);
        }
      } catch {
        // A register fn with an incompatible signature contributes nothing;
        // the pattern is reported as absent rather than guessed.
      }
    }
    return merged;
  };
  if (widgetsName) {
    pattern.widgetsFile = widgetsName;
    const widgets = asWidgetSummaries(
      (await captureFrom(widgetsName)).get("registerWidget"),
    );
    if (widgets.length > 0) {
      pattern.widgets = widgets;
    }
  }
  if (statusName) {
    pattern.statusFile = statusName;
    const ids = asIdList(
      (await captureFrom(statusName)).get("registerStatusItem"),
    );
    if (ids.length > 0) {
      pattern.statusIds = ids;
    }
  }
  if (commandsName) {
    pattern.commandsFile = commandsName;
    const ids = asCommandList(
      (await captureFrom(commandsName)).get("registerCommand"),
    );
    if (ids.length > 0) {
      pattern.commandIds = ids;
    }
  }
  const shell = entries.filter(
    (name) =>
      name.endsWith("Workbench.tsx") ||
      name.endsWith("Layout.tsx") ||
      name.endsWith("Page.tsx"),
  );
  if (shell.length > 0) {
    pattern.shellFiles = shell;
  }
  return pattern;
}

/**
 * Project stack straight from package.json: package manager first, then
 * sorted runtime + dev dependencies as name@version. No hardcoded frameworks.
 */
function buildStack(pkg: {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): string[] {
  const names = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ].sort();
  const stack = names.map((name) => {
    const version =
      pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? "?";
    return `${name}@${version}`;
  });
  if (pkg.packageManager) {
    stack.unshift(pkg.packageManager);
  }
  return stack;
}

async function loadSnapshot(repoRoot: string): Promise<AiSnapshot> {
  const pkg = readJson<{
    name?: string;
    version?: string;
    packageManager?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  }>(join(repoRoot, "package.json"));
  const { createPresetRegistry } = await import("../src/workbench/layouts");
  const { KNOWN_FEATURES, resolveFeaturesOrThrow } = await import(
    "../src/workbench/features"
  );
  const { workbenchConfig, workbenchThemes } = await import(
    "../src/app/workbench.config"
  );

  const registry = createPresetRegistry();
  const presetSources = new Map<string, string>();
  const featuresDir = join(repoRoot, "src", "features");
  try {
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
        const mod = (await import(join(featuresDir, feature, entry))) as Record<
          string,
          unknown
        >;
        for (const exported of Object.values(mod)) {
          if (isPresetLike(exported) && !registry.has(exported.id)) {
            registry.registerPreset(
              exported as Parameters<typeof registry.registerPreset>[0],
            );
            presetSources.set(exported.id, join(featuresDir, feature, entry));
          }
        }
      }
    }
  } catch {
    fail(`Preset sources not found under "${featuresDir}".`);
  }
  const presets = registry.list().sort((a, b) => a.id.localeCompare(b.id));
  if (presets.length === 0) {
    fail("No layout presets found in src/features/*/*Preset.ts.");
  }
  const presetPatterns: PresetPattern[] = [];
  for (const preset of presets) {
    const source = presetSources.get(preset.id);
    if (source) {
      presetPatterns.push(
        await discoverPresetPatterns(repoRoot, preset, source),
      );
    }
  }
  const active = registry.get(workbenchConfig.layout);
  if (!active) {
    fail(
      `workbench.config.ts layout "${workbenchConfig.layout}" matches no preset. Known presets: ${presets.map((p) => p.id).join(", ")}.`,
    );
  }
  let resolved: string[];
  try {
    resolved = resolveFeaturesOrThrow(active, {
      with: workbenchConfig.with,
      without: workbenchConfig.without,
    }) as string[];
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  let themeFiles: string[] = [];
  try {
    themeFiles = readdirSync(join(repoRoot, "src", "styles", "themes"))
      .filter((name) => name.endsWith(".css"))
      .map((name) => name.replace(/\.css$/, ""))
      .sort();
  } catch {
    themeFiles = [];
  }

  const scriptKeys = Object.keys(pkg.scripts ?? {}).sort();
  const relevantScripts = scriptKeys.filter((name) =>
    /^(dev|build|typecheck|lint|test|generate:|ai:|validate|self-test)/.test(
      name,
    ),
  );

  let projectKind = "boilerplate source";
  try {
    const marker = readJson<{ template?: string; preset?: string }>(
      join(repoRoot, ".boilerplate.json"),
    );
    if (marker.template === "tanstack-desktop-workbench") {
      projectKind = "derived application";
    }
  } catch {
    // Absent marker means this checkout is the boilerplate source itself.
  }

  return {
    packageName: pkg.name ?? "unknown",
    packageVersion: pkg.version ?? "0.0.0",
    projectKind,
    stack: buildStack(pkg),
    appName: workbenchConfig.appName,
    preset: workbenchConfig.layout,
    theme: workbenchConfig.theme,
    withFeatures: [...(workbenchConfig.with ?? [])].sort(),
    withoutFeatures: [...(workbenchConfig.without ?? [])].sort(),
    resolvedFeatures: [...resolved].sort(),
    knownCoreFeatures: [...KNOWN_FEATURES].sort(),
    customFeatures: extractCustomFeatures(repoRoot),
    presetIds: presets.map((preset) => preset.id),
    presets: presets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      defaultFeatures: [...preset.defaultFeatures].sort(),
    })),
    presetPatterns,
    themes: [...workbenchThemes],
    themeFiles,
    controls: discoverControls(repoRoot),
    widgets: extractIds(
      repoRoot,
      (content) => content.includes("registerWidget"),
      /id:\s*"([^"]+)"/g,
    ),
    commands: extractCommandIds(repoRoot),
    tools: extractIds(
      repoRoot,
      (content) =>
        content.includes("registerTool") ||
        content.includes(": ToolDefinition"),
      /id:\s*"([^"]+)"/g,
    ),
    statusItems: extractIds(
      repoRoot,
      (content) => content.includes("registerStatusItem"),
      /id:\s*"([^"]+)"/g,
    ),
    relevantScripts,
    templates: "inline templates in scripts/generate-*.ts (no templates dir)",
  };
}

function renderPresetPattern(pattern: PresetPattern): string[] {
  const lines: string[] = [
    `### \`${pattern.id}\` · dir \`${pattern.dir}\``,
    "",
  ];
  const regions = ["top", "left", "center", "right", "bottom"]
    .map((region) => {
      const slots = pattern.slots[region] ?? [];
      return slots.length > 0 ? `${region}=[${slots.join(", ")}]` : null;
    })
    .filter((part): part is string => part !== null);
  lines.push(
    `- composition: ${regions.join(" ")} | features: ${pattern.defaultFeatures.join(", ")}`,
  );
  if (pattern.ribbonFile && pattern.ribbonTabs) {
    const tabs = pattern.ribbonTabs.map((tab) => {
      const groups = tab.groups
        .map((group) => `${group.id}(${group.tools.join(",")})`)
        .join(" ");
      return `${tab.label}[${groups}]`;
    });
    lines.push(`- ribbon (\`${pattern.ribbonFile}\`): ${tabs.join(" | ")}`);
  }
  if (pattern.toolsFile && pattern.railTools) {
    lines.push(
      `- rail (\`${pattern.toolsFile}\`): ${pattern.railTools.join(", ")}`,
    );
  }
  if (pattern.toolsFile && pattern.toolDefCount) {
    const parts =
      pattern.toolsDir && pattern.toolPartFiles
        ? ` + ${pattern.toolPartFiles.length} parts in \`${pattern.toolsDir}/\` (${pattern.toolPartFiles.join(", ")})`
        : "";
    lines.push(
      `- tools: ${pattern.toolDefCount} defs (\`${pattern.toolsFile}\`${parts})`,
    );
  }
  if (pattern.widgetsFile && pattern.widgets) {
    const widgets = pattern.widgets
      .map(
        (widget) =>
          `${widget.id}(${widget.title},${widget.dock},${widget.visible ? "visible" : "hidden"})`,
      )
      .join(" ");
    lines.push(`- widgets (\`${pattern.widgetsFile}\`): ${widgets}`);
  }
  if (pattern.statusFile && pattern.statusIds) {
    lines.push(
      `- status (\`${pattern.statusFile}\`): ${pattern.statusIds.join(", ")}`,
    );
  }
  if (pattern.commandsFile && pattern.commandIds) {
    const sample = pattern.commandIds.slice(0, 10).join(", ");
    const rest =
      pattern.commandIds.length > 10
        ? `, … (${pattern.commandIds.length} total)`
        : "";
    lines.push(`- commands (\`${pattern.commandsFile}\`): ${sample}${rest}`);
  }
  if (pattern.shellFiles) {
    lines.push(
      `- shell: ${pattern.shellFiles.map((file) => `\`${file}\``).join(", ")}`,
    );
  }
  const edits: string[] = [];
  if (pattern.ribbonFile) {
    edits.push(`tab→\`${pattern.ribbonFile}\``);
  }
  if (pattern.toolsFile) {
    const target = pattern.toolsDir
      ? `\`${pattern.toolsDir}/<tab>Tools.ts\``
      : `\`${pattern.toolsFile}\``;
    edits.push(
      pattern.commandsFile
        ? `tool→${target} + command→\`${pattern.commandsFile}\``
        : `tool→${target}`,
    );
  } else if (pattern.commandsFile) {
    edits.push(`command→\`${pattern.commandsFile}\``);
  }
  if (pattern.widgetsFile) {
    edits.push(`widget→\`${pattern.widgetsFile}\``);
  }
  if (pattern.statusFile) {
    edits.push(`status→\`${pattern.statusFile}\``);
  }
  edits.push(`slots→\`${pattern.presetFile}\``);
  if (pattern.shellFiles) {
    edits.push(
      `shell→${pattern.shellFiles.map((file) => `\`${file}\``).join(", ")}`,
    );
  }
  lines.push(`- edit: ${edits.join("; ")}`, "");
  return lines;
}

function renderControlsLibrary(controls: ControlEntry[]): string[] {
  const lines: string[] = [
    "## Controls library (primitives · shared core, never pruned)",
    "",
    "- Shared core: `src/components/workbench/primitives/` — available in every preset and kept in derived projects. The `/demo/controls` gallery (`src/features/showcase/`) is pruned from derived apps; this library is not.",
    "- Recipes: `docs/ai/canonical-examples.yaml` (`controls-form`, `controls-table`, `controls-dialog`). Toast UI lives in `src/components/workbench/shell/ToastStack.tsx` + `src/workbench/notifications` (not primitives).",
    "",
  ];
  for (const control of controls) {
    lines.push(
      `- **${control.family}** · \`${control.name}\` (\`${control.file}\`): ${control.purpose}`,
    );
  }
  lines.push("");
  return lines;
}

function digestOf(snapshot: AiSnapshot): string {
  const canonical = JSON.stringify(snapshot);
  return createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex")
    .slice(0, 16);
}

function renderContext(snapshot: AiSnapshot, digest: string): string {
  const lines: string[] = [
    "<!-- Generated file — do not edit manually. Regenerate with `bun run ai:context`. -->",
    `# Generated context — ${snapshot.appName}`,
    "",
    `- package: ${snapshot.packageName}@${snapshot.packageVersion} (${snapshot.projectKind})`,
    `- stack: ${snapshot.stack.join(", ") || "unknown"}`,
    `- preset: ${snapshot.preset} (layout ${snapshot.preset})`,
    `- theme: ${snapshot.theme} (files: ${snapshot.themeFiles.join(", ") || "none"})`,
    `- with: [${snapshot.withFeatures.join(", ")}]`,
    `- without: [${snapshot.withoutFeatures.join(", ")}]`,
    `- resolved features: ${snapshot.resolvedFeatures.join(", ")} (${snapshot.knownCoreFeatures.length} known core)`,
    `- custom features: ${snapshot.customFeatures.join(", ") || "none"}`,
    `- widgets: ${snapshot.widgets.join(", ") || "none"}`,
    `- commands: ${snapshot.commands.length} registered (${snapshot.commands.slice(0, 12).join(", ")}${snapshot.commands.length > 12 ? ", …" : ""})`,
    `- tools: ${snapshot.tools.join(", ") || "none"}`,
    `- status items: ${snapshot.statusItems.join(", ") || "none"}`,
    `- presets: ${snapshot.presetIds.join(", ")}`,
    `- scripts: ${snapshot.relevantScripts.join(", ")}`,
    `- templates: ${snapshot.templates}`,
    `- digest: ${digest}`,
    "",
    "## Presets (defaults)",
    "",
  ];
  for (const preset of snapshot.presets) {
    lines.push(
      `- ${preset.id} (${preset.label}): ${preset.defaultFeatures.join(", ")}`,
    );
  }
  lines.push("", "## Preset patterns (structure)", "");
  for (const pattern of snapshot.presetPatterns) {
    lines.push(...renderPresetPattern(pattern));
  }
  lines.push(...renderControlsLibrary(snapshot.controls));
  lines.push(
    "## Where to extend",
    "",
    "- Preferred: `src/features/**` (domain code), `src/styles/themes/**`, workbench.config, registries/runtime extension APIs.",
    "- Protected core: `src/components/workbench/**`, `src/workbench/**` (extend before modifying).",
    "- Scaffold first: bun run generate:feature|generate:widget|generate:command|generate:tool.",
    "- Validate: bun run lint, bun x tsc --noEmit, bun test, bun run ai:context:check.",
  );
  if (snapshot.projectKind === "derived application") {
    lines.push(
      "- Add a boilerplate preset later: `bun run generate:add-preset -- --from <boilerplate-dir> --preset <id>` (copies src/features/<id> with full wiring; check the boilerplate checkout for available ids).",
    );
  }
  lines.push("");
  return lines.join("\n");
}

export async function buildAiContext(
  repoRoot: string,
): Promise<{ content: string; digest: string; snapshot: AiSnapshot }> {
  const snapshot = await loadSnapshot(repoRoot);
  const digest = digestOf(snapshot);
  return { content: renderContext(snapshot, digest), digest, snapshot };
}

export function repoRootFromScriptsDir(scriptsDir: string): string {
  const root = join(scriptsDir, "..");
  const pkg = readJson<{ name?: string }>(join(root, "package.json"));
  if (pkg.name !== "tanstack-workbench") {
    try {
      const marker = readJson<{ template?: string }>(
        join(root, ".boilerplate.json"),
      );
      if (marker.template !== "tanstack-desktop-workbench") {
        throw new Error("not a generated project");
      }
    } catch {
      fail(
        `Expected the workbench boilerplate or a generated project at "${root}".`,
      );
    }
  }
  return root;
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
  const repoRoot = repoRootFromScriptsDir(
    dirname(fileURLToPath(import.meta.url)),
  );
  const check = bool(parsed, "check");
  const built = await buildAiContext(repoRoot);
  const dest = join(repoRoot, OUTPUT);
  if (check) {
    let current: string | null = null;
    try {
      current = readText(dest);
    } catch {
      current = null;
    }
    if (current !== built.content) {
      console.error(STALE_MESSAGE);
      process.exit(1);
    }
    console.log(`AI context is fresh (digest ${built.digest}).`);
    return;
  }
  ensureDir(join(repoRoot, "docs", "ai"));
  writeFile(dest, built.content, { force: true });
  console.log(`AI context written to ${OUTPUT} (digest ${built.digest}).`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
