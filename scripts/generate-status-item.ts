#!/usr/bin/env bun
/** Scaffold a status item registration module (toggle or readout). */
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

const SCRIPT = "generate:status-item";
const KINDS = ["toggle", "readout"] as const;

const spec: CommandSpec = {
  name: "generate:status-item",
  description: "Scaffold a status item registration module.",
  positionals: ["name"],
  flags: [
    {
      name: "kind",
      description: "Item kind: toggle|readout",
      default: "readout",
    },
    { name: "label", description: "Item label (default: Title Case of name)" },
    { name: "feature", description: "Owner feature dir (required)" },
    { name: "force", description: "Overwrite existing files", boolean: true },
    { name: "dry-run", description: "Report without writing", boolean: true },
  ],
};

const STATUS_TS = `import { globalStatus, type StatusRegistry } from "../../../workbench/status";

/** Register the {{ID}} status item. Call from the {{FEATURE}} feature entry. */
export function register{{PASCAL}}StatusItem(
  status: StatusRegistry = globalStatus,
): void {
  status.registerStatusItem({
    id: "{{ID}}",
    label: "{{LABEL}}",
    kind: "{{KIND}}"{{VALUE_LINE}},
  });
}
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (
    printHelpIfRequested(argv, SCRIPT, spec, [
      "bun run generate:status-item -- connection-state --kind readout --feature machine-control",
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
    fail("Missing status-item <name>.");
  }
  const id = normalizeExtensionId(rawName, "status item");
  const kind = str(parsed, "kind") ?? "readout";
  if (!(KINDS as readonly string[]).includes(kind)) {
    fail(`Invalid --kind "${kind}". Expected one of: ${KINDS.join("|")}.`);
  }
  const featureRaw = str(parsed, "feature");
  if (!featureRaw) {
    fail("Missing --feature. Status items live under their owner feature.");
  }
  const featureId = normalizeExtensionId(featureRaw, "feature");
  const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  if (!exists(join(repoRoot, "src", "features", featureId))) {
    fail(
      `Unknown feature "${featureId}". Run "bun run generate:feature -- ${featureId}" first.`,
    );
  }
  const vars = {
    ID: id,
    LABEL: str(parsed, "label") ?? toTitle(id),
    KIND: kind,
    PASCAL: toPascal(id),
    FEATURE: featureId,
    VALUE_LINE: kind === "readout" ? `,\n    value: ""` : "",
  };
  const tree: Record<string, string> = {
    [`src/features/${featureId}/status/${id}.ts`]: STATUS_TS,
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
  console.log(`Status item "${id}" scaffolded. Next:`);
  console.log(
    `  1. Call register${toPascal(id)}StatusItem() from the ${featureId} feature entry.`,
  );
  refreshAiContextIfAvailable(repoRoot);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
