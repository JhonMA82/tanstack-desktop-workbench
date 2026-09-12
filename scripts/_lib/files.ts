/** Deterministic file helpers shared by every generator. */
import { execSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

/** Create a directory and all parents (no-op when it exists). */
export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

/** True when the path exists (file or directory). */
export function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

/** True when the path is a non-empty directory. */
export function isNonEmptyDir(path: string): boolean {
  try {
    return readdirSync(path).length > 0;
  } catch {
    return false;
  }
}

/**
 * Write a file, creating parents. Fails when the file exists unless force
 * is true. Returns "created" or "overwritten" for dry-run reporting.
 */
export function writeFile(
  path: string,
  content: string,
  options: { force?: boolean } = {},
): "created" | "overwritten" {
  if (exists(path) && !options.force) {
    throw new Error(
      `Refusing to overwrite "${path}". Pass --force to replace it.`,
    );
  }
  const overwritten = exists(path);
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
  return overwritten ? "overwritten" : "created";
}

/** Read a UTF-8 text file. */
export function readText(path: string): string {
  return readFileSync(path, "utf8");
}

/** Read and parse a JSON file. Throws a readable error on invalid JSON. */
export function readJson<T>(path: string): T {
  const text = readText(path);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON in "${path}".`);
  }
}

/** List every file under dir, relative to dir, sorted for determinism. */
export function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(current, entry.name), relative);
      } else if (entry.isFile()) {
        out.push(relative);
      }
    }
  };
  walk(dir, "");
  return out;
}

/** Remove a directory tree. Only call with staging dirs or validated targets. */
export function removeDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

/** Non-empty directory check used before destructive moves. */
export function assertEmptyDir(path: string, what: string): void {
  if (isNonEmptyDir(path)) {
    throw new Error(
      `${what} "${path}" already exists and is not empty. Pass --force only when it carries a valid .boilerplate.json marker.`,
    );
  }
}

/**
 * Resolve the project root from a script dir (parent of scripts/). Accepts
 * the boilerplate source (package name) or a materialized project (valid
 * .boilerplate.json marker from this template). Throws otherwise.
 */
export function findRepoRoot(scriptsDir: string): string {
  const root = join(scriptsDir, "..");
  const pkg = readJson<{ name?: string }>(join(root, "package.json"));
  if (pkg.name === "tanstack-workbench") {
    return root;
  }
  try {
    const marker = readJson<{ template?: string }>(
      join(root, ".boilerplate.json"),
    );
    if (marker.template === "tanstack-desktop-workbench") {
      return root;
    }
  } catch {
    // Fall through to the readable error below.
  }
  throw new Error(
    `Expected the workbench boilerplate or a generated project at "${root}".`,
  );
}

/**
 * Refresh generated AI context when the `ai:context` script exists.
 * Generates `docs/ai/generated-context.md` in place; no-op note otherwise.
 */
export function refreshAiContextIfAvailable(repoRoot: string): void {
  const pkg = readJson<{ scripts?: Record<string, string> }>(
    join(repoRoot, "package.json"),
  );
  if (!pkg.scripts?.["ai:context"]) {
    console.log(
      'AI context auto-refresh is a Phase C gap: run "bun run ai:context" once it exists.',
    );
    return;
  }
  try {
    execSync("bun run ai:context", { cwd: repoRoot, stdio: "inherit" });
  } catch {
    throw new Error(`"bun run ai:context" failed in "${repoRoot}".`);
  }
}
