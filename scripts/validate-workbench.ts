#!/usr/bin/env bun
/**
 * Workbench configuration validation (data-driven, §27).
 *
 * Checks the application manifest against the real canonical registries:
 * preset/theme existence, valid with/without (no overlap, custom features
 * registered), load-bearing capabilities kept (via resolveFeaturesOrThrow),
 * referenced widgets/tools/commands existing, tools pointing at registered
 * commands, slots referencing hostable capabilities only, and every preset
 * resolving coherently. Fail-fast with concrete messages; exit 2 on failure.
 */
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

const SCRIPT = "validate:workbench";

const spec: CommandSpec = {
  name: "validate:workbench",
  description:
    "Validate workbench.config.ts against the real preset/feature/theme registries.",
  flags: [],
};

const EXAMPLES = ["bun run validate:workbench"];

const TEST_SUFFIX = /\.test\.tsx?$/;

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function srcFiles(root: string): string[] {
  const abs = join(root, "src");
  if (!exists(abs)) {
    return [];
  }
  return listFilesRecursive(abs)
    .filter((rel) => /\.(ts|tsx)$/.test(rel) && !TEST_SUFFIX.test(rel))
    .map((rel) => join(abs, rel))
    .sort();
}

/** ids registered via registerCommand("id") or ["id", "label", shortcut?] tables. */
function extractCommandIds(root: string, files: string[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of files) {
    const content = readText(file);
    if (!content.includes("registerCommand")) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const pattern of [
        /registerCommand\(\s*"([^"]+)"/g,
        /\["([\w][\w.:~-]*)",\s*"[^"]*"/g,
      ]) {
        for (const match of line.matchAll(pattern)) {
          const id = match[1];
          if (id && !/[$`\s]/.test(id) && !ids.has(id)) {
            ids.set(id, `${relative(root, file)}:${index + 1}`);
          }
        }
      }
    });
  }
  return ids;
}

/** `id: "..."` hits inside files that register the given kind. */
function extractRegistryIds(
  root: string,
  files: string[],
  marker: (content: string) => boolean,
): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of files) {
    const content = readText(file);
    if (!marker(content)) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/id:\s*"([^"]+)"/g)) {
        const id = match[1];
        if (id && !/[$`\s]/.test(id) && !ids.has(id)) {
          ids.set(id, `${relative(root, file)}:${index + 1}`);
        }
      }
    });
  }
  return ids;
}

/** Custom feature ids from registerFeature({ id: "..." }) plus const XFeatureId = "...". */
function extractCustomFeatures(
  root: string,
  files: string[],
): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of files) {
    const content = readText(file);
    if (!content.includes("registerFeature")) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const pattern of [
        /registerFeature\(\s*\{\s*id:\s*"([^"]+)"/g,
        /\b\w+FeatureId\s*=\s*"([^"]+)"/g,
      ]) {
        for (const match of line.matchAll(pattern)) {
          const id = match[1];
          if (id && !/[$`\s]/.test(id) && !ids.has(id)) {
            ids.set(id, `${relative(root, file)}:${index + 1}`);
          }
        }
      }
    });
  }
  return ids;
}

/** Capability ids declared in registerFeature capabilities: [...] literals. */
function extractCustomCapabilities(files: string[]): Set<string> {
  const caps = new Set<string>();
  for (const file of files) {
    const content = readText(file);
    if (!content.includes("registerFeature")) {
      continue;
    }
    for (const block of content.matchAll(/capabilities:\s*\[([^\]]*)\]/g)) {
      for (const literal of block[1].matchAll(/"([^"]+)"/g)) {
        caps.add(literal[1]);
      }
    }
  }
  return caps;
}

/** Tool ids referenced by ribbon groups, rails, and layout views. */
function extractToolRefs(
  root: string,
  files: string[],
): Array<{ id: string; at: string }> {
  const refs: Array<{ id: string; at: string }> = [];
  for (const file of files) {
    const content = readText(file);
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      const toolsBlock = line.match(/tools:\s*\[([^\]]*)\]/);
      if (toolsBlock) {
        for (const match of toolsBlock[1].matchAll(/"([A-Za-z0-9._~-]+)"/g)) {
          refs.push({
            id: match[1],
            at: `${relative(root, file)}:${index + 1}`,
          });
        }
      }
      if (
        /railTools:\s*\[|rightWidgets:\s*\[|bottomWidgets:\s*\[/.test(line) ||
        /RailTools[^=]*=\s*\[/.test(line)
      ) {
        const listBlock = line.match(
          /(?:railTools|rightWidgets|bottomWidgets):\s*\[([^\]]*)\]/,
        );
        for (const match of (listBlock?.[1] ?? "").matchAll(
          /"([A-Za-z0-9._~-]+)"/g,
        )) {
          refs.push({
            id: match[1],
            at: `${relative(root, file)}:${index + 1}`,
          });
        }
      }
    });
  }
  return refs;
}

function isPresetLike(value: unknown): value is {
  id: string;
  slots: Record<string, string[]>;
  defaultFeatures: unknown;
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
  const errors: string[] = [];

  const { createPresetRegistry } = await import("../src/workbench/layouts");
  const { KNOWN_FEATURES, createFeatureRegistry } = await import(
    "../src/workbench/features"
  );
  const { workbenchConfig, workbenchThemes } = await import(
    "../src/app/workbench.config"
  );

  // Canonical presets, globbed from the real *Preset.ts modules (never listed).
  const presets = createPresetRegistry();
  const featuresDir = join(root, "src", "features");
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
          if (isPresetLike(exported) && !presets.has(exported.id)) {
            presets.registerPreset(
              exported as Parameters<typeof presets.registerPreset>[0],
            );
          }
        }
      }
    }
  } catch {
    fail(`Preset sources not found under "${featuresDir}".`);
  }
  const presetIds = presets.list().map((preset) => preset.id);
  if (presetIds.length === 0) {
    fail("No layout presets found in src/features/*/*Preset.ts.");
  }

  const files = srcFiles(root);
  const commandIds = extractCommandIds(root, files);
  const widgetIds = extractRegistryIds(root, files, (content) =>
    content.includes("registerWidget"),
  );
  const toolIds = extractRegistryIds(
    root,
    files,
    (content) =>
      content.includes("registerTool") || content.includes(": ToolDefinition"),
  );
  const statusIds = extractRegistryIds(root, files, (content) =>
    content.includes("registerStatusItem"),
  );
  const customFeatures = extractCustomFeatures(root, files);
  const customCaps = extractCustomCapabilities(files);

  // 1. Preset exists.
  const active = presets.get(workbenchConfig.layout);
  if (!active) {
    errors.push(
      `Unknown preset "${workbenchConfig.layout}" in workbench.config.ts. Known presets: ${[...presetIds].sort().join(", ")}.`,
    );
  }

  // 2. Theme exists (manifest union plus a real theme file).
  if (!(workbenchThemes as readonly string[]).includes(workbenchConfig.theme)) {
    errors.push(
      `Unknown theme "${workbenchConfig.theme}" in workbench.config.ts. Known themes: ${[...workbenchThemes].join(", ")}.`,
    );
  } else if (
    !exists(
      join(root, "src", "styles", "themes", `${workbenchConfig.theme}.css`),
    )
  ) {
    errors.push(
      `Theme "${workbenchConfig.theme}" has no file src/styles/themes/${workbenchConfig.theme}.css.`,
    );
  }

  // 3. with/without are known (core or registered custom), never overlapping.
  const knownCore = new Set<string>(KNOWN_FEATURES as readonly string[]);
  const withIds = [...(workbenchConfig.with ?? [])];
  const withoutIds = [...(workbenchConfig.without ?? [])];
  for (const id of withIds) {
    if (!knownCore.has(id) && !customFeatures.has(id)) {
      errors.push(
        `Unknown feature id in "with": "${id}". Known core: ${[...knownCore].sort().join(", ")}. Registered custom: ${[...customFeatures.keys()].sort().join(", ") || "none"}.`,
      );
    }
  }
  for (const id of withoutIds) {
    if (!knownCore.has(id) && !customFeatures.has(id)) {
      errors.push(`Unknown feature id in "without": "${id}".`);
    }
  }
  const overlap = withIds.filter((id) => withoutIds.includes(id));
  if (overlap.length > 0) {
    errors.push(
      `Feature(s) in both "with" and "without": ${overlap.join(", ")}.`,
    );
  }

  // 4. The manifest combination resolves (load-bearing + hosting via the real resolver).
  if (active) {
    const registry = createFeatureRegistry();
    for (const [id, at] of customFeatures) {
      const caps = [...customCaps];
      if (caps.length === 0) {
        errors.push(
          `Custom feature "${id}" (registered at ${at}) declares no hosting capability.`,
        );
        continue;
      }
      try {
        registry.registerFeature({ id, capabilities: caps });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    try {
      const resolved = registry.resolveFeaturesOrThrow(active, {
        with: withIds,
        without: withoutIds,
      });
      console.log(
        `resolved: preset "${active.id}" + with [${withIds.join(", ")}] - without [${withoutIds.join(", ")}] -> ${resolved.join(", ")}`,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  // 5. Referenced widgets/tools/status items exist.
  for (const { id, at } of extractToolRefs(root, files)) {
    if (toolIds.has(id) || widgetIds.has(id)) {
      continue;
    }
    // Capability-looking refs (kebab ids of features) belong to slots, not registries.
    if (knownCore.has(id) || customFeatures.has(id)) {
      continue;
    }
    errors.push(`Unknown tool/widget reference "${id}" at ${at}.`);
  }
  for (const file of files) {
    const content = readText(file);
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/widgetId="([^"]+)"/g)) {
        if (!widgetIds.has(match[1])) {
          errors.push(
            `Unknown widget reference "${match[1]}" at ${relative(root, file)}:${index + 1}.`,
          );
        }
      }
    });
  }

  // 6. Tools point at registered commands.
  for (const file of files) {
    const content = readText(file);
    if (
      !content.includes("registerTool") &&
      !content.includes(": ToolDefinition")
    ) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/command:\s*"([^"]+)"/g)) {
        if (!commandIds.has(match[1])) {
          errors.push(
            `Tool references unknown command "${match[1]}" at ${relative(root, file)}:${index + 1}.`,
          );
        }
      }
    });
  }

  // 7. Slots reference hostable capabilities only.
  const hostable = new Set<string>();
  {
    const probe = createFeatureRegistry();
    for (const id of knownCore) {
      for (const cap of probe.capabilitiesOf(id) ?? []) {
        hostable.add(cap);
      }
    }
  }
  for (const cap of customCaps) {
    hostable.add(cap);
  }
  for (const preset of presets.list()) {
    for (const [slot, caps] of Object.entries(preset.slots)) {
      for (const cap of caps as string[]) {
        if (!hostable.has(cap)) {
          errors.push(
            `Preset "${preset.id}" slot "${slot}" references impossible capability "${cap}" (no known or custom feature declares it).`,
          );
        }
      }
    }
  }

  // 8. Every preset resolves coherently with its defaults.
  for (const preset of presets.list()) {
    const registry = createFeatureRegistry();
    try {
      registry.resolveFeaturesOrThrow(preset);
    } catch (error) {
      errors.push(
        `Preset "${preset.id}" defaults are incoherent: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 5b. Status items flipped by commands exist.
  for (const file of files) {
    const content = readText(file);
    if (
      !content.includes("status.toggle") &&
      !content.includes("status.show")
    ) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(
        /status\.(?:toggle|show|hide)\("(\S+?)"\)/g,
      )) {
        if (!statusIds.has(match[1])) {
          errors.push(
            `Unknown status item reference "${match[1]}" at ${relative(root, file)}:${index + 1}.`,
          );
        }
      }
    });
  }

  if (errors.length > 0) {
    console.error(`validate:workbench found ${errors.length} problem(s):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    fail("workbench.config.ts validation failed.");
  }
  console.log(
    `validate:workbench passed (preset "${workbenchConfig.layout}", theme "${workbenchConfig.theme}", ${presetIds.length} presets coherent).`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
