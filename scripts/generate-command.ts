#!/usr/bin/env bun
/**
 * Scaffold a registered command (sync or async). The generator creates the
 * registration module only; it never inserts logic into the Ribbon.
 */
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
import {
  normalizeExtensionId,
  toCamel,
  toPascal,
  toTitle,
} from "./_lib/naming";
import { renderTree } from "./_lib/templates";

const SCRIPT = "generate:command";

const spec: CommandSpec = {
  name: "generate:command",
  description: "Scaffold a command registration module (sync or async).",
  positionals: ["name"],
  flags: [
    {
      name: "feature",
      description: "Owner feature dir (default: commands live at feature root)",
    },
    {
      name: "label",
      description: "Command label (default: Title Case of name)",
    },
    {
      name: "shortcut",
      description: "Optional keyboard shortcut, e.g. Ctrl+K",
    },
    { name: "async", description: "Generate an async handler", boolean: true },
    { name: "force", description: "Overwrite existing files", boolean: true },
    { name: "dry-run", description: "Report without writing", boolean: true },
  ],
};

const COMMAND_TS = `import {
  type CommandRegistry,
  globalCommands,
} from "../../../workbench/commands";

/** {{COMMAND_TITLE}} command id. Reused by Ribbon, shortcuts, palette, and tools. */
export const {{CONST}} = "{{ID}}";

export function register{{PASCAL_FN}}(
  commands: CommandRegistry = globalCommands,
): void {
  commands.registerCommand({{CONST}}, {{HANDLER}}{{OPTS}});
}
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (
    printHelpIfRequested(argv, SCRIPT, spec, [
      "bun run generate:command -- connect-machine --feature machine-control",
      "bun run generate:command -- export-job --feature machine-control --async --shortcut Ctrl+E",
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
      "Missing command <name>. Example: bun run generate:command -- connect-machine.",
    );
  }
  // Command ids may be dotted (machine.connect); validate each segment.
  const segments = rawName.split(".");
  const id = segments.map((s) => normalizeExtensionId(s, "command")).join(".");
  const featureRaw = str(parsed, "feature");
  const featureId = featureRaw
    ? normalizeExtensionId(featureRaw, "feature")
    : null;
  const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  if (featureId && !exists(join(repoRoot, "src", "features", featureId))) {
    fail(
      `Unknown feature "${featureId}". Run "bun run generate:feature -- ${featureId}" first.`,
    );
  }
  const constName = `${toCamel(segments.join("-"))}CommandId`;
  const fnName = `register${toPascal(segments.join("-"))}Command`;
  const label = str(parsed, "label") ?? toTitle(segments[segments.length - 1]);
  const shortcut = str(parsed, "shortcut");
  const isAsync = bool(parsed, "async");
  const handler = isAsync
    ? `async () => {\n    // TODO: implement the async command body.\n  }`
    : `() => {\n    // TODO: implement the command body.\n  }`;
  const opts =
    shortcut !== undefined
      ? `, { label: "${label}", shortcut: "${shortcut}" }`
      : `, { label: "${label}" }`;
  const dir = featureId ? `src/features/${featureId}/commands` : "src/commands";
  const vars = {
    ID: id,
    CONST: constName,
    PASCAL_FN: fnName,
    COMMAND_TITLE: toTitle(segments.join(" ")),
    HANDLER: handler,
    OPTS: opts,
  };
  const tree: Record<string, string> = {
    [`${dir}/${segments[segments.length - 1]}.ts`]: COMMAND_TS,
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
  console.log(`Command "${id}" scaffolded. Next:`);
  console.log(`  1. Call ${fnName}() from the ${featureId ?? "app"} entry.`);
  console.log(
    `  2. Reference "${id}" from tools/shortcuts/palette (never duplicate its logic).`,
  );
  refreshAiContextIfAvailable(repoRoot);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
