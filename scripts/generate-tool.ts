#!/usr/bin/env bun
/**
 * Scaffold a declarative tool that resolves an existing command. Tools hold
 * no logic; they point at a command id owned by a feature.
 */
import { type Dirent, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bool,
  type CommandSpec,
  fail,
  type ParsedArgs,
  parseArgs,
  printHelpIfRequested,
  str,
} from "./_lib/cli";
import {
  exists,
  findRepoRoot,
  refreshAiContextIfAvailable,
} from "./_lib/files";
import { normalizeExtensionId, toPascal, toTitle } from "./_lib/naming";
import { renderTree } from "./_lib/templates";

const SCRIPT = "generate:tool";

const spec: CommandSpec = {
  name: "generate:tool",
  description: "Scaffold a declarative tool resolving an existing command.",
  positionals: ["name"],
  flags: [
    {
      name: "command",
      description: "Command id this tool executes (required)",
    },
    { name: "group", description: "Ribbon/rail group (default: feature id)" },
    { name: "shortcut", description: "Optional keyboard shortcut" },
    { name: "feature", description: "Owner feature dir (required)" },
    { name: "force", description: "Overwrite existing files", boolean: true },
    { name: "dry-run", description: "Report without writing", boolean: true },
  ],
};

const TOOL_TS = `import { Wrench } from "lucide-react";
import { globalTools, type ToolRegistry } from "../../../workbench/tools";

/**
 * {{TITLE}} tool. Declarative: it resolves command "{{COMMAND}}" and holds
 * no logic of its own.
 */
export function register{{PASCAL}}Tool(
  tools: ToolRegistry = globalTools,
): void {
  tools.registerTool({
    id: "{{ID}}",
    label: "{{TITLE}}",
    icon: Wrench,
    command: "{{COMMAND}}",
    group: "{{GROUP}}"{{SHORTCUT_LINE}},
  });
}
`;

/** Best-effort data-driven check: is the command registered anywhere in src? */
function commandExists(repoRoot: string, commandId: string): boolean {
  const needle = `registerCommand("${commandId}"`;
  const walk = (dir: string): boolean => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (walk(full)) {
          return true;
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        try {
          if (readFileSync(full, "utf8").includes(needle)) {
            return true;
          }
        } catch {}
      }
    }
    return false;
  };
  return walk(join(repoRoot, "src"));
}

function main(): void {
  const argv = process.argv.slice(2);
  if (
    printHelpIfRequested(argv, SCRIPT, spec, [
      "bun run generate:tool -- home-machine --command machine.ping --group machine --feature machine-control",
    ])
  ) {
    return;
  }
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv, spec);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const rawName = parsed.positionals[0];
  if (!rawName) {
    fail(
      "Missing tool <name>. Example: bun run generate:tool -- home-machine --command machine.ping --feature machine-control.",
    );
  }
  const id = normalizeExtensionId(rawName, "tool");
  const commandId = str(parsed, "command");
  if (!commandId) {
    fail("Missing --command. A tool must resolve an existing command id.");
  }
  const featureRaw = str(parsed, "feature");
  if (!featureRaw) {
    fail("Missing --feature. Tools live under their owner feature.");
  }
  const featureId = normalizeExtensionId(featureRaw, "feature");
  const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  if (!exists(join(repoRoot, "src", "features", featureId))) {
    fail(
      `Unknown feature "${featureId}". Run "bun run generate:feature -- ${featureId}" first.`,
    );
  }
  if (!commandExists(repoRoot, commandId)) {
    console.warn(
      `Warning: command "${commandId}" is not registered anywhere under src/. The tool is still generated; register the command before use.`,
    );
  }
  const group = str(parsed, "group") ?? featureId;
  const shortcut = str(parsed, "shortcut");
  const vars = {
    ID: id,
    TITLE: toTitle(id),
    PASCAL: toPascal(id),
    COMMAND: commandId,
    GROUP: group,
    SHORTCUT_LINE:
      shortcut !== undefined ? `,\n    shortcut: "${shortcut}"` : "",
  };
  const tree: Record<string, string> = {
    [`src/features/${featureId}/tools/${id}.ts`]: TOOL_TS,
  };
  const force = bool(parsed, "force");
  const dryRun = bool(parsed, "dry-run");
  const results = renderTree(tree, vars, { dest: repoRoot, force, dryRun });
  for (const result of results) {
    console.log(`${result.status}: ${result.path}`);
  }
  if (dryRun) {
    return;
  }
  console.log(`Tool "${id}" scaffolded. Next:`);
  console.log(
    `  1. Call register${toPascal(id)}Tool() from the ${featureId} feature entry.`,
  );
  console.log(
    `  2. Add "${id}" to a Ribbon group or the tool rail (never duplicate command logic).`,
  );
  refreshAiContextIfAvailable(repoRoot);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
