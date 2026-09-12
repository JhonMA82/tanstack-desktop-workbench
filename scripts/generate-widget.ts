#!/usr/bin/env bun
/**
 * Scaffold a widget: component + minimal registration wiring. Never edits
 * WorkbenchShell; the widget is registered explicitly by the caller.
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
import { normalizeExtensionId, toPascal, toTitle } from "./_lib/naming";
import { escapeJsxText, renderTree } from "./_lib/templates";

const SCRIPT = "generate:widget";
const DOCKS = ["left", "right", "bottom", "floating", "hidden"] as const;

const spec: CommandSpec = {
  name: "generate:widget",
  description: "Scaffold a widget component plus registration wiring.",
  positionals: ["name"],
  flags: [
    {
      name: "dock",
      description: "Dock slot: left|right|bottom|floating|hidden",
      default: "right",
    },
    {
      name: "title",
      description: "Widget title (default: Title Case of name)",
    },
    { name: "feature", description: "Owner feature dir (default: widget id)" },
    { name: "force", description: "Overwrite existing files", boolean: true },
    { name: "dry-run", description: "Report without writing", boolean: true },
  ],
};

const COMPONENT_TSX = `/**
 * {{TITLE}} widget view. Uses workbench tokens (--wb-*) only; no domain logic.
 */
export function {{PASCAL}}Widget(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col gap-2 bg-[var(--wb-surface)] p-3 text-[var(--wb-text)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
        {{TITLE_ESCAPED}}
      </p>
      <p className="text-xs text-[var(--wb-text-muted)]">
        TODO: render the {{ID}} content here.
      </p>
    </div>
  );
}
`;

const REGISTER_TS = `import { Gauge } from "lucide-react";
import {
  globalWidgets,
  type WidgetRegistry,
} from "../../../workbench/widgets";
import { {{PASCAL}}Widget } from "./{{PASCAL}}";

/** Register the {{ID}} widget. Call from the {{FEATURE}} feature entry. */
export function register{{PASCAL}}Widget(
  registry: WidgetRegistry = globalWidgets,
): void {
  registry.registerWidget({
    id: "{{ID}}",
    title: "{{TITLE}}",
    icon: Gauge,
    component: {{PASCAL}}Widget,
    defaultPosition: "{{DOCK}}",
    closable: true,
    resizable: true,
    visible: true,
  });
}
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (
    printHelpIfRequested(argv, SCRIPT, spec, [
      "bun run generate:widget -- telemetry --dock right --feature machine-control",
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
      "Missing widget <name>. Example: bun run generate:widget -- telemetry --dock right.",
    );
  }
  const id = normalizeExtensionId(rawName, "widget");
  const dock = str(parsed, "dock") ?? "right";
  if (!(DOCKS as readonly string[]).includes(dock)) {
    fail(`Invalid --dock "${dock}". Expected one of: ${DOCKS.join("|")}.`);
  }
  const title = str(parsed, "title") ?? toTitle(id);
  const feature = str(parsed, "feature") ?? id;
  const featureId = normalizeExtensionId(feature, "feature");
  const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  if (!exists(join(repoRoot, "src", "features", featureId))) {
    fail(
      `Unknown feature "${featureId}". Run "bun run generate:feature -- ${featureId}" first.`,
    );
  }
  const pascal = toPascal(id);
  const vars = {
    ID: id,
    TITLE: title,
    TITLE_ESCAPED: escapeJsxText(title),
    PASCAL: pascal,
    DOCK: dock,
    FEATURE: featureId,
  };
  const base = `src/features/${featureId}/widgets/${pascal}`;
  const tree: Record<string, string> = {
    [`${base}.tsx`]: COMPONENT_TSX,
    [`${base}.register.ts`]: REGISTER_TS,
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
  console.log(`Widget "${id}" scaffolded. Next:`);
  console.log(
    `  1. Call register${pascal}Widget() from the ${featureId} feature entry.`,
  );
  console.log(
    `  2. Render it with <WidgetHost widgetId="${id}" /> (never edit WorkbenchShell).`,
  );
  refreshAiContextIfAvailable(repoRoot);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
