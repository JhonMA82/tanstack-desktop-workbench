/**
 * Deliberately simple template engine: {{tokens}} in explicit inline
 * templates, unresolved-token detection, no accidental overwrites.
 */
import { join } from "node:path";
import { ensureDir, exists, writeFile } from "./files";

export type TemplateVars = Record<string, string>;

const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/** Render {{tokens}} from vars. Throws listing every unresolved token. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  const rendered = template.replace(
    TOKEN_PATTERN,
    (match, name: string) => vars[name] ?? match,
  );
  const unresolved = new Set<string>();
  for (const match of rendered.matchAll(TOKEN_PATTERN)) {
    unresolved.add(match[1]);
  }
  if (unresolved.size > 0) {
    throw new Error(
      `Unresolved template tokens: ${[...unresolved].sort().join(", ")}.`,
    );
  }
  return rendered;
}

/** Escape a value for embedding inside a TS/JS single-quoted string. */
export function escapeTsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/** Escape a value for embedding inside JSX text content. */
export function escapeJsxText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

export interface RenderedFile {
  path: string;
  status: "created" | "overwritten" | "skipped";
}

/**
 * Render a tree of {relativePath: template} into dest. Every template is
 * rendered with the same vars; unresolved tokens fail before any write.
 * Existing files are kept unless force is true. Returns per-file outcomes
 * for dry-run reporting.
 */
export function renderTree(
  tree: Record<string, string>,
  vars: TemplateVars,
  options: { dest: string; force?: boolean; dryRun?: boolean },
): RenderedFile[] {
  const rendered = new Map<string, string>();
  for (const [relative, template] of Object.entries(tree)) {
    rendered.set(relative, renderTemplate(template, vars));
  }
  const results: RenderedFile[] = [];
  for (const [relative, content] of [...rendered.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const path = join(options.dest, relative);
    if (options.dryRun) {
      results.push({
        path,
        status: exists(path) ? "skipped" : "created",
      });
      continue;
    }
    if (exists(path) && !options.force) {
      throw new Error(
        `Refusing to overwrite "${path}". Pass --force to replace it.`,
      );
    }
    const overwritten = exists(path);
    ensureDir(join(options.dest, relative.split("/").slice(0, -1).join("/")));
    writeFile(path, content, { force: options.force });
    results.push({ path, status: overwritten ? "overwritten" : "created" });
  }
  return results;
}
