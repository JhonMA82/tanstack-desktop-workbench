#!/usr/bin/env bun
/**
 * Architectural invariant checks for the Desktop Workbench boilerplate.
 *
 * Only invariants worth automating (no parallel mega-linter): core/feature
 * isolation, --wb-* token discipline, command delegation in Ribbon/ToolRail,
 * duplicate registry ids, resolvable presets, theme token parity, and
 * scaffolding templates that resolve every token. Fail-fast with concrete
 * file:line messages; exit 2 on the first failing invariant group.
 */
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type CommandSpec,
  fail,
  type ParsedArgs,
  parseArgs,
  printHelpIfRequested,
} from "./_lib/cli";
import { exists, listFilesRecursive, readText } from "./_lib/files";

const SCRIPT = "validate:architecture";

const spec: CommandSpec = {
  name: "validate:architecture",
  description:
    "Check workbench architectural invariants (isolation, tokens, delegation, ids, presets, parity, templates).",
  flags: [],
};

const EXAMPLES = ["bun run validate:architecture"];

const CORE_DIRS = ["src/components/workbench", "src/workbench"];
const TEST_SUFFIX = /\.test\.tsx?$/;

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function sourceFiles(root: string, dirs: string[]): string[] {
  const out: string[] = [];
  for (const dir of dirs) {
    const abs = join(root, dir);
    if (!exists(abs)) {
      continue;
    }
    for (const rel of listFilesRecursive(abs)) {
      if (/\.(ts|tsx|css)$/.test(rel) && !TEST_SUFFIX.test(rel)) {
        out.push(join(abs, rel));
      }
    }
  }
  return out.sort();
}

function allSrcFiles(root: string): string[] {
  const abs = join(root, "src");
  if (!exists(abs)) {
    return [];
  }
  return listFilesRecursive(abs)
    .filter((rel) => /\.(ts|tsx|css)$/.test(rel) && !TEST_SUFFIX.test(rel))
    .map((rel) => join(abs, rel))
    .sort();
}

function here(root: string, file: string, line: number): string {
  return `${relative(root, file)}:${line}`;
}

/** 1. Core never imports feature modules (domain code stays out of the shell). */
function checkCoreIsolation(root: string): string[] {
  const errors: string[] = [];
  const pattern =
    /from\s+["'][^"']*\/features\/|import\(\s*["'][^"']*\/features\//;
  for (const file of sourceFiles(root, CORE_DIRS)) {
    const lines = readText(file).split("\n");
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        errors.push(
          `${here(root, file, index + 1)}: core imports a feature module (keep domain code in src/features/**).`,
        );
      }
    });
  }
  return errors;
}

/** 2. Workbench visuals use semantic --wb-* tokens only; no hardcoded colors in core code. */
function checkThemeTokens(root: string): string[] {
  const errors: string[] = [];
  const varPattern = /var\(\s*(--[A-Za-z0-9-]+)/g;
  const colorPattern = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;
  for (const file of sourceFiles(root, CORE_DIRS)) {
    const lines = readText(file).split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(varPattern)) {
        if (!match[1].startsWith("--wb-")) {
          errors.push(
            `${here(root, file, index + 1)}: non-semantic token "${match[1]}" (use var(--wb-*) only).`,
          );
        }
      }
      if (
        (file.endsWith(".tsx") || file.endsWith(".ts")) &&
        colorPattern.test(line)
      ) {
        errors.push(
          `${here(root, file, index + 1)}: hardcoded color in core code (use var(--wb-*) tokens).`,
        );
      }
    });
  }
  // Features must also resolve styling through --wb-* tokens, never ad-hoc vars.
  for (const file of allSrcFiles(root)) {
    if (!file.includes(`${join("src", "features")}/`)) {
      continue;
    }
    const lines = readText(file).split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(varPattern)) {
        if (!match[1].startsWith("--wb-")) {
          errors.push(
            `${here(root, file, index + 1)}: non-semantic token "${match[1]}" (use var(--wb-*) only).`,
          );
        }
      }
    });
  }
  return errors;
}

/** 3. Ribbon/ToolRail delegate to registered commands; they never own command logic. */
function checkCommandDelegation(root: string): string[] {
  const errors: string[] = [];
  const shell = join(root, "src", "components", "workbench", "shell");
  for (const name of ["Ribbon.tsx", "ToolRail.tsx"]) {
    const file = join(shell, name);
    if (!exists(file)) {
      errors.push(
        `shell/${name} is missing (expected command delegation surface).`,
      );
      continue;
    }
    const content = readText(file);
    if (content.includes("registerCommand")) {
      errors.push(
        `${relative(root, file)}: registers commands inside the shell (register via the command registry, resolve by id here).`,
      );
    }
    if (!/selectTool|execute\(|useCommands|useTools/.test(content)) {
      errors.push(
        `${relative(root, file)}: resolves no registered command (tools must execute a registered command id).`,
      );
    }
  }
  return errors;
}

interface IdHit {
  id: string;
  file: string;
  line: number;
}

function collectIds(
  _root: string,
  files: string[],
  matcher: (content: string) => boolean,
  pattern: RegExp,
): IdHit[] {
  const hits: IdHit[] = [];
  for (const file of files) {
    const content = readText(file);
    if (!matcher(content)) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(new RegExp(pattern, "g"))) {
        const id = match[1];
        if (id && !/[$`\s]/.test(id)) {
          hits.push({ id, file, line: index + 1 });
        }
      }
    });
  }
  return hits;
}

/** 4. Duplicate ids fail fast, per registry kind. */
function checkDuplicateIds(root: string): string[] {
  const errors: string[] = [];
  const files = allSrcFiles(root);
  const groups: Array<{
    kind: string;
    matcher: (content: string) => boolean;
    pattern: RegExp;
  }> = [
    {
      kind: "command",
      matcher: (content) => content.includes("registerCommand"),
      pattern: /registerCommand\(\s*"([^"]+)"/,
    },
    {
      kind: "command",
      matcher: (content) => content.includes("registerCommand"),
      pattern: /\["([\w][\w.:~-]*)",\s*"[^"]*"/,
    },
    {
      kind: "widget",
      matcher: (content) => content.includes("registerWidget"),
      pattern: /id:\s*"([^"]+)"/,
    },
    {
      kind: "tool",
      matcher: (content) =>
        content.includes("registerTool") ||
        content.includes(": ToolDefinition"),
      pattern: /id:\s*"([^"]+)"/,
    },
    {
      kind: "status item",
      matcher: (content) => content.includes("registerStatusItem"),
      pattern: /id:\s*"([^"]+)"/,
    },
    {
      kind: "feature",
      matcher: (content) => content.includes("registerFeature"),
      pattern: /registerFeature\(\s*\{\s*id:\s*"([^"]+)"/,
    },
  ];
  const seen = new Map<string, IdHit>();
  for (const group of groups) {
    seen.clear();
    for (const hit of collectIds(root, files, group.matcher, group.pattern)) {
      const key = `${group.kind}:${hit.id}`;
      const first = seen.get(key);
      if (first) {
        errors.push(
          `Duplicate ${group.kind} id "${hit.id}": ${here(root, first.file, first.line)} and ${here(root, hit.file, hit.line)}.`,
        );
      } else {
        seen.set(key, hit);
      }
    }
  }
  return errors;
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

/** 5. Every preset resolves to a valid feature combination. */
async function checkPresetsResolve(root: string): Promise<string[]> {
  const errors: string[] = [];
  const { createPresetRegistry } = await import("../src/workbench/layouts");
  const { resolveFeaturesOrThrow } = await import("../src/workbench/features");
  const registry = createPresetRegistry();
  const featuresDir = join(root, "src", "features");
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
        }
      }
    }
  }
  const presets = registry.list();
  if (presets.length === 0) {
    return ["No layout presets found in src/features/*/*Preset.ts."];
  }
  for (const preset of presets) {
    try {
      resolveFeaturesOrThrow(preset);
    } catch (error) {
      errors.push(
        `Preset "${preset.id}" does not resolve: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return errors;
}

/** 6. Theme token parity: every used --wb-* token exists in tokens.css and in each theme. */
function checkThemeParity(root: string): string[] {
  const errors: string[] = [];
  const readTokens = (file: string): Set<string> => {
    const found = new Set<string>();
    for (const match of readText(file).matchAll(/(--wb-[A-Za-z0-9-]+)\s*:/g)) {
      found.add(match[1]);
    }
    return found;
  };
  const tokensFile = join(root, "src", "styles", "tokens.css");
  if (!exists(tokensFile)) {
    return [`src/styles/tokens.css is missing (token contract undefined).`];
  }
  const declared = readTokens(tokensFile);
  const themesDir = join(root, "src", "styles", "themes");
  let themeFiles: string[] = [];
  try {
    themeFiles = readdirSync(themesDir)
      .filter((name) => name.endsWith(".css"))
      .sort();
  } catch {
    return [`src/styles/themes/ is missing (no themes to compare).`];
  }
  if (themeFiles.length === 0) {
    return [`src/styles/themes/ holds no theme files.`];
  }
  const themeSets = new Map<string, Set<string>>();
  for (const name of themeFiles) {
    themeSets.set(name, readTokens(join(themesDir, name)));
  }
  const baseline = themeSets.get(themeFiles[0]) ?? new Set<string>();
  for (const name of themeFiles.slice(1)) {
    const current = themeSets.get(name) ?? new Set<string>();
    for (const token of baseline) {
      if (!current.has(token)) {
        errors.push(
          `Theme "${name}" misses token "${token}" (parity with "${themeFiles[0]}").`,
        );
      }
    }
    for (const token of current) {
      if (!baseline.has(token)) {
        errors.push(
          `Theme "${name}" adds undeclared token "${token}" (parity with "${themeFiles[0]}").`,
        );
      }
    }
  }
  const used = new Set<string>();
  for (const file of allSrcFiles(root)) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) {
      continue;
    }
    for (const match of readText(file).matchAll(
      /var\(\s*(--wb-[A-Za-z0-9-]+)/g,
    )) {
      used.add(match[1]);
    }
  }
  for (const token of [...used].sort()) {
    if (!declared.has(token)) {
      errors.push(
        `Token "${token}" is used in sources but missing from src/styles/tokens.css.`,
      );
    }
    for (const [name, set] of themeSets) {
      if (!set.has(token)) {
        errors.push(
          `Token "${token}" is used in sources but missing from theme "${name}".`,
        );
      }
    }
  }
  return errors;
}

/** 8. Features reuse the shared primitives library; they never reinvent raw controls. */
/**
 * No grandfathered raw-control sites remain: every feature control
 * resolves through the primitives library in
 * src/components/workbench/primitives/*. Any raw control tag in
 * src/features/** fails in full-detection mode (no baseline, no
 * allowlist): new reinventions always fail.
 */
const REINVENTED_CONTROLS_BASELINE: Record<string, number> = {};
function checkReinventedControls(root: string): string[] {
  const errors: string[] = [];
  const featuresDir = join(root, "src", "features");
  if (!exists(featuresDir)) {
    return errors;
  }
  const pattern = /<(button|table|input|select|textarea)\b/;
  const hint =
    'use the primitives library in src/components/workbench/primitives/*; catalog in docs/ai/generated-context.md "Controls library"';
  const sites = new Map<string, Array<{ line: number; tag: string }>>();
  for (const rel of listFilesRecursive(featuresDir)) {
    if (!rel.endsWith(".tsx") || TEST_SUFFIX.test(rel)) {
      continue;
    }
    const file = join(featuresDir, rel);
    const lines = readText(file).split("\n");
    lines.forEach((line, index) => {
      const match = line.match(pattern);
      if (match) {
        const list = sites.get(relative(root, file)) ?? [];
        list.push({ line: index + 1, tag: match[1] });
        sites.set(relative(root, file), list);
      }
    });
  }
  for (const [file, hits] of sites) {
    const baseline = REINVENTED_CONTROLS_BASELINE[file];
    if (baseline === undefined) {
      for (const hit of hits) {
        errors.push(
          `${file}:${hit.line}: raw <${hit.tag}> in features (${hint}).`,
        );
      }
    } else if (hits.length > baseline) {
      errors.push(
        `${file}: raw-control sites grew from ${baseline} to ${hits.length} (migrate to ${hint}).`,
      );
    }
  }
  return errors;
}

/** 7. Scaffolding templates resolve every token (dry-run smoke of each generator). */
function checkTemplateTokens(root: string): string[] {
  const errors: string[] = [];
  const cases: Array<[string, string]> = [
    ["generate-feature.ts", "-- probe-arch-feature --dry-run"],
    [
      "generate-widget.ts",
      "-- probe-arch-widget --dock right --feature technical-ribbon --dry-run",
    ],
    [
      "generate-command.ts",
      "-- probe-arch-command --feature technical-ribbon --dry-run",
    ],
    [
      "generate-tool.ts",
      "-- probe-arch-tool --command view.reset --feature technical-ribbon --dry-run",
    ],
    [
      "generate-status-item.ts",
      "-- probe-arch-status --kind readout --feature technical-ribbon --dry-run",
    ],
    ["generate-preset.ts", "-- probe-arch-preset --dry-run"],
  ];
  for (const [script, args] of cases) {
    try {
      const out = execSync(`bun ${join(root, "scripts", script)} ${args}`, {
        cwd: root,
        encoding: "utf8",
        stdio: "pipe",
      });
      if (/Unresolved template tokens/.test(out)) {
        errors.push(`${script} --dry-run left template tokens unresolved.`);
      }
    } catch (error) {
      const stderr =
        error instanceof Error && "stderr" in error
          ? String((error as { stderr?: unknown }).stderr)
          : error instanceof Error
            ? error.message
            : String(error);
      errors.push(
        `${script} --dry-run failed (templates must resolve every token): ${stderr.trim().split("\n").slice(0, 3).join(" ")}`,
      );
    }
  }
  return errors;
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
  void parsed;
  const root = repoRoot();
  const groups: Array<[string, () => string[] | Promise<string[]>]> = [
    ["core/feature isolation", () => checkCoreIsolation(root)],
    ["--wb-* token discipline", () => checkThemeTokens(root)],
    [
      "command delegation (Ribbon/ToolRail)",
      () => checkCommandDelegation(root),
    ],
    ["duplicate registry ids", () => checkDuplicateIds(root)],
    ["preset resolution", () => checkPresetsResolve(root)],
    ["theme token parity", () => checkThemeParity(root)],
    ["scaffolding template tokens", () => checkTemplateTokens(root)],
    [
      "shared controls reuse (no reinvented controls)",
      () => checkReinventedControls(root),
    ],
  ];
  let failed = 0;
  for (const [name, run] of groups) {
    const errors = await run();
    if (errors.length === 0) {
      console.log(`ok: ${name}`);
    } else {
      failed += 1;
      console.error(`FAIL: ${name} (${errors.length})`);
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
    }
  }
  if (failed > 0) {
    fail(`validate:architecture found ${failed} failing invariant group(s).`);
  }
  console.log("validate:architecture passed (8 invariant groups).");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
