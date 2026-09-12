#!/usr/bin/env bun
/**
 * Scaffold an application feature: a functional vertical living outside
 * the core (src/features/<name>/), wired through the extensible feature
 * registry. No domain logic is generated, only registration wiring.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bool,
  type CommandSpec,
  fail,
  list,
  type ParsedArgs,
  parseArgs,
  printHelpIfRequested,
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

const SCRIPT = "generate:feature";

const spec: CommandSpec = {
  name: "generate:feature",
  description: "Scaffold src/features/<name>/ with registry wiring.",
  positionals: ["name"],
  flags: [
    {
      name: "capability",
      description: "Hosting slot capability (repeatable, default: viewport)",
      multiple: true,
    },
    { name: "force", description: "Overwrite existing files", boolean: true },
    { name: "dry-run", description: "Report without writing", boolean: true },
  ],
};

const FEATURE_TS = `import { globalFeatures } from "../../workbench/features";

/**
 * {{TITLE}} feature id. Registered outside the core catalog via the
 * extensible feature registry; the core never imports this module.
 */
export const {{CAMEL}}FeatureId = "{{ID}}";

export function register{{PASCAL}}Feature(): void {
  globalFeatures.registerFeature({
    id: {{CAMEL}}FeatureId,
    capabilities: [{{CAPABILITIES}}],
  });
}
`;

const COMMANDS_TS = `import {
  type CommandRegistry,
  globalCommands,
} from "../../workbench/commands";

/** Command ids owned by the {{ID}} feature. */
export const {{CAMEL}}Commands = ["{{ID}}.ping"] as const;

export function register{{PASCAL}}Commands(
  commands: CommandRegistry = globalCommands,
): void {
  commands.registerCommand("{{ID}}.ping", async () => {
    // TODO: implement the feature's first real command (async-ready).
  }, { label: "{{TITLE}} Ping" });
}
`;

const TOOLS_TS = `import { Box } from "lucide-react";
import { globalTools, type ToolRegistry } from "../../workbench/tools";

/** Tools owned by the {{ID}} feature. Commands hold the logic; tools only resolve them. */
export function register{{PASCAL}}Tools(
  tools: ToolRegistry = globalTools,
): void {
  tools.registerTool({
    id: "{{ID}}-default",
    label: "{{TITLE}}",
    icon: Box,
    command: "{{ID}}.ping",
    group: "{{ID}}",
  });
}
`;

const INDEX_TS = `export * from "./feature";
export * from "./commands";
export * from "./tools";
import { register{{PASCAL}}Commands } from "./commands";
import { register{{PASCAL}}Feature } from "./feature";
import { register{{PASCAL}}Tools } from "./tools";

/** Register every {{ID}} extension with the default runtime. */
export function register{{PASCAL}}(): void {
  register{{PASCAL}}Feature();
  register{{PASCAL}}Commands();
  register{{PASCAL}}Tools();
}
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (
    printHelpIfRequested(argv, SCRIPT, spec, [
      "bun run generate:feature -- machine-control",
      "bun run generate:feature -- telemetry --capability console --capability bottom-panel",
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
      "Missing feature <name>. Example: bun run generate:feature -- machine-control.",
    );
  }
  const id = normalizeExtensionId(rawName, "feature");
  const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  const dir = join(repoRoot, "src", "features", id);
  const force = bool(parsed, "force");
  const dryRun = bool(parsed, "dry-run");
  const capabilities = list(parsed, "capability");
  if (capabilities.length === 0) {
    capabilities.push("viewport");
  }
  const vars = {
    ID: id,
    TITLE: toTitle(id),
    PASCAL: toPascal(id),
    CAMEL: toCamel(id),
    CAPABILITIES: capabilities.map((c) => `"${c}"`).join(", "),
  };
  const tree: Record<string, string> = {
    [`src/features/${id}/feature.ts`]: FEATURE_TS,
    [`src/features/${id}/commands.ts`]: COMMANDS_TS,
    [`src/features/${id}/tools.ts`]: TOOLS_TS,
    [`src/features/${id}/index.ts`]: INDEX_TS,
  };
  if (!dryRun && exists(dir) && !force) {
    for (const relative of Object.keys(tree)) {
      if (exists(join(repoRoot, relative))) {
        fail(`"${relative}" already exists. Pass --force to replace it.`);
      }
    }
  }
  const results = renderTree(tree, vars, {
    dest: repoRoot,
    force,
    dryRun,
  });
  for (const result of results) {
    console.log(`${result.status}: ${result.path}`);
  }
  if (dryRun) {
    return;
  }
  console.log(`Feature "${id}" scaffolded. Next:`);
  console.log(
    `  1. Call register${toPascal(id)}() from your app entry (never from the core).`,
  );
  console.log(
    `  2. Adjust capabilities in src/features/${id}/feature.ts to real slot ids.`,
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
