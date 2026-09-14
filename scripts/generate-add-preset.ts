#!/usr/bin/env bun
/**
 * Add boilerplate presets to a derived project.
 *
 * Copies src/features/<id> trees from a boilerplate source dir (--from)
 * into this project, wires the derived router (component + side-effect
 * preset imports + presetComponents entry), widens the WorkbenchLayoutId
 * union, updates the pruned catalog assertions, and refreshes AI context.
 * Never touches themes, shell core, or existing preset files.
 */
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
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
import {
  findRepoRoot,
  readJson,
  refreshAiContextIfAvailable,
} from "./_lib/files";
import { toCamel } from "./_lib/naming";
import { PRESET_ROUTER_WIRING, pruneLoadBearing } from "./_lib/preset-wiring";

const SCRIPT = "generate:add-preset";

const spec: CommandSpec = {
  name: "generate:add-preset",
  description:
    "Copy boilerplate presets into a derived project and wire them (--from <boilerplate-dir> --preset <id>).",
  flags: [
    { name: "from", description: "Boilerplate source directory" },
    {
      name: "preset",
      description: "Preset id to add (repeatable, comma-separated)",
      multiple: true,
    },
    {
      name: "force",
      description: "Overwrite existing preset dirs",
      boolean: true,
    },
    { name: "dry-run", description: "Report without writing", boolean: true },
  ],
};

const EXAMPLES = [
  "bun run generate:add-preset -- --from ../tanstack-desktop-workbench --preset ide",
  "bun run generate:add-preset -- --from ../tanstack-desktop-workbench --preset ide,studio",
];

/** Preset ids discovered in a source dir via src/features/<id>∕*Preset.ts. */
function discoverSourcePresets(fromRoot: string): string[] {
  const featuresDir = join(fromRoot, "src", "features");
  let entries: string[];
  try {
    entries = readdirSync(featuresDir).sort();
  } catch {
    fail(
      `Source dir "${fromRoot}" holds no src/features tree; pass the boilerplate checkout with --from.`,
    );
  }
  const ids: string[] = [];
  for (const entry of entries!) {
    let files: string[];
    try {
      files = readdirSync(join(featuresDir, entry)).sort();
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith("Preset.ts") || file.endsWith(".test.ts")) {
        continue;
      }
      const content = readFileSync(join(featuresDir, entry, file), "utf8");
      const match = content.match(/id:\s*"([^"]+)"/);
      if (match && match[1] === entry) {
        ids.push(entry);
        break;
      }
      // Fall back to the directory name when the file exists but the
      // id literal is formatted unexpectedly; the wiring check below
      // still fails loudly on truly unknown ids.
      if (!ids.includes(entry)) {
        ids.push(entry);
        break;
      }
    }
  }
  return [...new Set(ids)].sort();
}

function replaceOrThrow(
  source: string,
  pattern: string | RegExp,
  replacement: string,
  what: string,
): string {
  const after = source.replace(pattern, replacement);
  if (after === source) {
    fail(
      `Add-preset failure (${what}): expected pattern not found; the derived file may have drifted.`,
    );
  }
  return after;
}

function parseUnionIds(unionText: string): string[] {
  const ids: string[] = [];
  for (const match of unionText.matchAll(/"([^"]+)"/g)) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

function parseBracketIds(bracketText: string): string[] {
  const ids: string[] = [];
  for (const match of bracketText.matchAll(/"([^"]+)"/g)) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

function patchRouterText(
  source: string,
  newIds: string[],
  force: boolean,
): string {
  for (const id of newIds) {
    if (!PRESET_ROUTER_WIRING[id]) {
      fail(`Add-preset failure: no router wiring for preset "${id}".`);
    }
  }
  let out = source;
  const anchor = `import { resolveFeaturesOrThrow } from "../workbench/features";`;
  if (!out.includes(anchor)) {
    fail(
      `Add-preset failure (router resolveFeaturesOrThrow import): expected pattern not found; the derived file may have drifted.`,
    );
  }
  for (const id of newIds) {
    const wiring = PRESET_ROUTER_WIRING[id];
    const componentImport = `import { ${wiring.component} } from "${wiring.componentFrom}";\n`;
    const sideEffectImport = `import "${wiring.presetSideEffect}";\n`;
    if (!out.includes(componentImport)) {
      out = replaceOrThrow(
        out,
        anchor,
        `${componentImport}${anchor}`,
        `router component import (${id})`,
      );
    } else if (!force) {
      fail(
        `Add-preset failure: router already imports component for preset "${id}". Pass --force to re-apply.`,
      );
    }
    if (!out.includes(sideEffectImport)) {
      out = replaceOrThrow(
        out,
        anchor,
        `${sideEffectImport}${anchor}`,
        `router preset import (${id})`,
      );
    } else if (!force && out.includes(`"${id}":`)) {
      fail(
        `Add-preset failure: router already wires preset "${id}". Pass --force to re-apply.`,
      );
    }
  }
  const tableMatch = out.match(
    /const presetComponents: Record<string, PresetComponent> = \{([^}]*)\};/,
  );
  if (!tableMatch) {
    fail(
      `Add-preset failure (router presetComponents): expected pattern not found; the derived file may have drifted.`,
    );
  }
  const existing = parseBracketIds(tableMatch[1]);
  for (const id of existing) {
    if (!PRESET_ROUTER_WIRING[id]) {
      fail(
        `Add-preset failure: router wires unknown preset "${id}"; the derived file may have drifted.`,
      );
    }
  }
  const merged = [...existing];
  for (const id of [...newIds].sort()) {
    if (!merged.includes(id)) {
      merged.push(id);
    }
  }
  const entries = merged
    .map((id) => `  "${id}": ${PRESET_ROUTER_WIRING[id].component},`)
    .join("\n");
  out = replaceOrThrow(
    out,
    /const presetComponents: Record<string, PresetComponent> = \{[^}]*\};/,
    `const presetComponents: Record<string, PresetComponent> = {\n${entries}\n};`,
    "router presetComponents",
  );
  for (const id of newIds) {
    if (!out.includes(`"${id}"`)) {
      fail(
        `Add-preset failure: router lost preset "${id}" after wiring; the derived file may have drifted.`,
      );
    }
  }
  for (const marker of ["<Outlet />", "ErrorBoundary"]) {
    if (!out.includes(marker)) {
      fail(
        `Add-preset failure: router lost its working shell (${marker}); the derived file may have drifted.`,
      );
    }
  }
  return out;
}

function widenUnionText(
  source: string,
  newIds: string[],
): { text: string; finalKept: string[] } {
  const match = source.match(/export type WorkbenchLayoutId =(.*?);/s);
  if (!match) {
    fail(
      `Add-preset failure (workbench.config union): expected pattern not found; the derived file may have drifted.`,
    );
  }
  const existing = parseUnionIds(match[1]);
  if (existing.length === 0) {
    fail(
      `Add-preset failure (workbench.config union): no preset ids found; the derived file may have drifted.`,
    );
  }
  const merged = [...existing];
  for (const id of [...newIds].sort()) {
    if (!merged.includes(id)) {
      merged.push(id);
    }
  }
  const union = merged.map((id) => `"${id}"`).join(" | ");
  const text = replaceOrThrow(
    source,
    /export type WorkbenchLayoutId =(.*?);/s,
    `export type WorkbenchLayoutId = ${union};`,
    "workbench.config union",
  );
  return { text, finalKept: merged };
}

function updatePresetsTest(
  source: string,
  finalKept: string[],
  newIds: string[],
  primary: string,
): string {
  if (source.includes("preset catalog (pruned)")) {
    let out = source;
    const anchor = `import { resolveFeaturesOrThrow } from "./features";`;
    if (!out.includes(anchor)) {
      fail(
        `Add-preset failure (presets.test imports): expected pattern not found; the derived file may have drifted.`,
      );
    }
    for (const id of finalKept) {
      const wiring = PRESET_ROUTER_WIRING[id];
      if (!wiring) {
        fail(`Add-preset failure: no router wiring for preset "${id}".`);
      }
      const line = `import "${wiring.presetSideEffect}";`;
      if (!out.includes(line)) {
        out = replaceOrThrow(
          out,
          anchor,
          `${line}\n${anchor}`,
          `presets.test import (${id})`,
        );
      }
    }
    const listMatch = out.match(/for \(const id of \[(.*?)\]\)/s);
    if (!listMatch) {
      fail(
        `Add-preset failure (presets.test kept list): expected pattern not found; the derived file may have drifted.`,
      );
    }
    const keptList = finalKept.map((id) => `"${id}"`).join(", ");
    out = replaceOrThrow(
      out,
      /for \(const id of \[(.*?)\]\)/s,
      `for (const id of [${keptList}])`,
      "presets.test kept list",
    );
    const oldComment = listMatch[1].trim();
    if (oldComment.length > 0 && out.includes(`(${oldComment})`)) {
      out = out.replace(`(${oldComment})`, `(${keptList})`);
    }
    const tailAnchor = `expect(globalPresets.get("${primary}")).toBeDefined();`;
    if (!out.includes(tailAnchor)) {
      fail(
        `Add-preset failure (presets.test tail): expected pattern not found; the derived file may have drifted.`,
      );
    }
    for (const id of newIds) {
      if (out.includes(`globalPresets.get("${id}")`)) {
        continue;
      }
      const camel = toCamel(id);
      const block = `    const ${camel} = globalPresets.get("${id}");\n        if (!${camel}) {\n          throw new Error('Kept preset "${id}" is not registered');\n        }\n        expect(resolveFeaturesOrThrow(${camel})).toContain("${pruneLoadBearing(id)}");\n\n`;
      out = replaceOrThrow(
        out,
        tailAnchor,
        `${block}${tailAnchor}`,
        `presets.test resolve block (${id})`,
      );
    }
    return out;
  }
  if (source.includes("registers all ten presets")) {
    for (const id of newIds) {
      if (!source.includes(`"${id}"`)) {
        fail(
          `Add-preset failure: source catalog does not list preset "${id}"; the source file may have drifted.`,
        );
      }
    }
    return source;
  }
  fail(
    `Add-preset failure (presets.test): unrecognized catalog shape; the derived file may have drifted.`,
  );
}

function updateWorkbenchConfigTest(
  source: string,
  finalKept: string[],
  newIds: string[],
): string {
  if (source.includes("workbench manifest (pruned)")) {
    let out = source;
    const anchor = `import { resolveFeaturesOrThrow } from "../workbench/features";`;
    if (!out.includes(anchor)) {
      fail(
        `Add-preset failure (workbench.config.test imports): expected pattern not found; the derived file may have drifted.`,
      );
    }
    for (const id of finalKept) {
      const wiring = PRESET_ROUTER_WIRING[id];
      if (!wiring) {
        fail(`Add-preset failure: no router wiring for preset "${id}".`);
      }
      const line = `import "${wiring.presetSideEffect}";`;
      if (!out.includes(line)) {
        out = replaceOrThrow(
          out,
          anchor,
          `${line}\n${anchor}`,
          `workbench.config.test import (${id})`,
        );
      }
    }
    const keptList = finalKept.map((id) => `"${id}"`).join(", ");
    const containMatch = out.match(/expect\(\[(.*?)\]\)\.toContain/s);
    if (!containMatch) {
      fail(
        `Add-preset failure (workbench.config.test kept list): expected pattern not found; the derived file may have drifted.`,
      );
    }
    out = replaceOrThrow(
      out,
      /expect\(\[(.*?)\]\)\.toContain/s,
      `expect([${keptList}]).toContain`,
      "workbench.config.test kept list",
    );
    const oldList = containMatch[1].trim();
    if (oldList.length > 0 && out.includes(`([${oldList}])`)) {
      out = out.replace(`([${oldList}])`, `([${keptList}])`);
    }
    for (const id of newIds) {
      if (!out.includes(`"${id}"`)) {
        fail(
          `Add-preset failure: workbench.config.test lost preset "${id}" after wiring.`,
        );
      }
    }
    return out;
  }
  if (
    source.includes("workbench manifest") ||
    source.includes("declares the technical-ribbon layout")
  ) {
    return source;
  }
  fail(
    `Add-preset failure (workbench.config.test): unrecognized catalog shape; the derived file may have drifted.`,
  );
}

function updateAiContextTest(
  source: string,
  finalKept: string[],
  newIds: string[],
): string {
  if (source.includes("pruned derived project")) {
    const match = source.match(
      /expect\(snapshot\.presetIds\)\.toEqual\(\[(.*?)\]\);/s,
    );
    if (!match) {
      fail(
        `Add-preset failure (ai-context.test kept list): expected pattern not found; the derived file may have drifted.`,
      );
    }
    const sorted = [...finalKept]
      .sort()
      .map((id) => `"${id}"`)
      .join(", ");
    const out = replaceOrThrow(
      source,
      /expect\(snapshot\.presetIds\)\.toEqual\(\[(.*?)\]\);/s,
      `expect(snapshot.presetIds).toEqual([${sorted}]);`,
      "ai-context.test kept list",
    );
    for (const id of newIds) {
      if (!out.includes(`"${id}"`)) {
        fail(
          `Add-preset failure: ai-context.test lost preset "${id}" after wiring.`,
        );
      }
    }
    return out;
  }
  if (source.includes("describes the real repo state")) {
    for (const id of newIds) {
      if (!source.includes(`"${id}"`)) {
        fail(
          `Add-preset failure: source ai-context catalog does not list preset "${id}".`,
        );
      }
    }
    return source;
  }
  fail(
    `Add-preset failure (ai-context.test): unrecognized catalog shape; the derived file may have drifted.`,
  );
}

function main(): void {
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
  const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  const fromArg = str(parsed, "from");
  if (!fromArg) {
    fail(
      "Missing --from <boilerplate-dir>. Example: bun run generate:add-preset -- --from ../tanstack-desktop-workbench --preset ide.",
    );
  }
  const fromRoot = resolve(process.cwd(), fromArg);
  if (!existsSync(join(fromRoot, "src", "features"))) {
    fail(
      `Source dir "${fromRoot}" holds no src/features tree; pass the boilerplate checkout with --from.`,
    );
  }
  const requested = [...new Set(list(parsed, "preset"))];
  if (requested.length === 0) {
    fail(
      "Missing --preset <id>. Example: bun run generate:add-preset -- --from ../boilerplate --preset ide.",
    );
  }
  const known = discoverSourcePresets(fromRoot);
  for (const id of requested) {
    if (!known.includes(id)) {
      fail(`Unknown preset "${id}". Known presets: ${known.join(", ")}.`);
    }
    if (!PRESET_ROUTER_WIRING[id]) {
      fail(`Add-preset failure: no router wiring for preset "${id}".`);
    }
    if (!existsSync(join(fromRoot, "src", "features", id))) {
      fail(
        `Source dir "${fromRoot}" holds no src/features/${id} tree for preset "${id}".`,
      );
    }
  }
  const force = bool(parsed, "force");
  const dryRun = bool(parsed, "dry-run");

  const existingDirs = requested.filter((id) =>
    existsSync(join(repoRoot, "src", "features", id)),
  );
  if (!dryRun && !force && existingDirs.length > 0) {
    fail(
      `"src/features/${existingDirs[0]}" already exists. Pass --force to replace it.`,
    );
  }
  const routerPath = join(repoRoot, "src", "app", "router.tsx");
  const configPath = join(repoRoot, "src", "app", "workbench.config.ts");
  if (!existsSync(routerPath) || !existsSync(configPath)) {
    fail(
      `Add-preset failure: expected derived files src/app/router.tsx and src/app/workbench.config.ts under "${repoRoot}".`,
    );
  }
  const routerText = readFileSync(routerPath, "utf8");
  const alreadyWired = requested.filter((id) =>
    routerText.includes(`"${id}":`),
  );
  if (!dryRun && !force && alreadyWired.length > 0) {
    fail(
      `Add-preset failure: router already wires preset "${alreadyWired[0]}". Pass --force to re-apply.`,
    );
  }
  const toAdd = force
    ? requested.filter((id) => !routerText.includes(`"${id}":`))
    : requested;

  if (dryRun) {
    console.log(
      `Dry run: add presets ${requested.join(", ")} from ${fromRoot}`,
    );
    console.log(
      `  copy: ${requested.map((id) => `src/features/${id}`).join(", ")}`,
    );
    console.log(
      `  wire router: ${requested.map((id) => `"${id}": ${PRESET_ROUTER_WIRING[id].component}`).join(", ")}`,
    );
    console.log(`  widen WorkbenchLayoutId with: ${requested.join(", ")}`);
    console.log(
      `  rewrite: src/app/router.tsx, src/app/workbench.config.ts, src/workbench/presets.test.ts, src/app/workbench.config.test.ts, scripts/ai-context.test.ts`,
    );
    return;
  }

  for (const id of requested) {
    const src = join(fromRoot, "src", "features", id);
    const dest = join(repoRoot, "src", "features", id);
    cpSync(src, dest, { recursive: true });
    console.log(`copied: src/features/${id}`);
  }

  const patchedRouter =
    toAdd.length > 0 ? patchRouterText(routerText, toAdd, force) : routerText;
  writeFileSync(routerPath, patchedRouter);

  const configText = readFileSync(configPath, "utf8");
  const unionMatch = configText.match(/export type WorkbenchLayoutId =(.*?);/s);
  const existingUnion = unionMatch ? parseUnionIds(unionMatch[1]) : [];
  const primary = existingUnion[0] ?? requested[0];
  const { text: widened, finalKept } = widenUnionText(configText, requested);
  writeFileSync(configPath, widened);

  const presetsTestPath = join(repoRoot, "src", "workbench", "presets.test.ts");
  writeFileSync(
    presetsTestPath,
    updatePresetsTest(
      readFileSync(presetsTestPath, "utf8"),
      finalKept,
      toAdd,
      primary,
    ),
  );
  const manifestTestPath = join(
    repoRoot,
    "src",
    "app",
    "workbench.config.test.ts",
  );
  writeFileSync(
    manifestTestPath,
    updateWorkbenchConfigTest(
      readFileSync(manifestTestPath, "utf8"),
      finalKept,
      toAdd,
    ),
  );
  const aiTestPath = join(repoRoot, "scripts", "ai-context.test.ts");
  writeFileSync(
    aiTestPath,
    updateAiContextTest(readFileSync(aiTestPath, "utf8"), finalKept, toAdd),
  );

  const markerPath = join(repoRoot, ".boilerplate.json");
  if (existsSync(markerPath)) {
    try {
      const marker = readJson<{
        template?: string;
        presets?: string[];
        preset?: string;
      }>(markerPath);
      if (marker.template === "tanstack-desktop-workbench") {
        const merged = [
          ...(marker.presets ?? (marker.preset ? [marker.preset] : [])),
        ];
        for (const id of [...requested].sort()) {
          if (!merged.includes(id)) {
            merged.push(id);
          }
        }
        writeFileSync(
          markerPath,
          `${JSON.stringify({ ...marker, presets: merged }, null, 2)}\n`,
        );
      }
    } catch {
      fail(
        `Add-preset failure: .boilerplate.json is not valid JSON; refusing to leave a half-wired project.`,
      );
    }
  }

  console.log(`Preset(s) ${requested.join(", ")} added. Next:`);
  console.log(
    `  1. Set \`layout\` in src/app/workbench.config.ts to one of: ${finalKept.map((id) => `"${id}"`).join(", ")}.`,
  );
  console.log(
    `  2. Run \`bun run ai:context\` to refresh the generated context.`,
  );
  if (process.env.WB_SKIP_AI_CONTEXT_REFRESH === "1") {
    console.log("Skipping AI context refresh (WB_SKIP_AI_CONTEXT_REFRESH=1).");
    return;
  }
  refreshAiContextIfAvailable(repoRoot);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
