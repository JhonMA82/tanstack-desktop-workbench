#!/usr/bin/env bun
/**
 * Scaffolder self-test: materialize real derived projects into temp dirs and
 * check end-to-end contracts (not just helper units).
 *
 * Cases: one per preset (all seven) plus technical-ribbon with custom
 * with/without. Per case: materialization, final config, prune assertions
 * (no showcase, no unchosen presets/themes, no demo routes), source-only
 * removal, .boilerplate.json, generated AI context plus ai:context:check
 * passing INSIDE the derived project, per-case typecheck (node_modules
 * symlinked from the boilerplate, read-only, with per-case timing), and
 * derived generators still working. The custom case additionally runs a real
 * generate:feature in the derived project and revalidates its context. Temp fixtures are always removed. Exit 2 on failure.
 */
import { exec, execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  type CommandSpec,
  fail,
  parseArgs,
  printHelpIfRequested,
} from "./_lib/cli";

const SCRIPT = "self-test:scaffolding";

const spec: CommandSpec = {
  name: "self-test:scaffolding",
  description:
    "Materialize temp derived projects and verify real scaffolding contracts.",
  flags: [],
};

const EXAMPLES = ["bun run self-test:scaffolding"];

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPTS_DIR, "..");

const execAsync = promisify(exec);
// Bounded concurrency for derived typechecks: 8 cases share only the
// read-only boilerplate node_modules/.bin/tsc binary, each case runs with
// cwd + node_modules symlink inside its own parent/<case.name> dir (no
// shared fixture dirs, no ports, no global state), so 4 at a time is safe
// and keeps memory/CPU bounded.
const TYPECHECK_CONCURRENCY = 4;

interface Case {
  name: string;
  preset: string;
  theme: string;
  with?: string[];
  without?: string[];
  appName: string;
}

const ALL_PRESET_IDS = [
  "technical-ribbon",
  "ide",
  "studio",
  "operator",
  "minimal",
  "monitoring",
  "setup",
] as const;

const ALL_THEME_IDS = ["ocstudio", "light"] as const;

const CASES: Case[] = [
  {
    name: "probe-ribbon",
    preset: "technical-ribbon",
    theme: "ocstudio",
    appName: "Probe Ribbon",
  },
  { name: "probe-ide", preset: "ide", theme: "ocstudio", appName: "Probe Ide" },
  {
    name: "probe-studio",
    preset: "studio",
    theme: "ocstudio",
    appName: "Probe Studio",
  },
  {
    name: "probe-operator",
    preset: "operator",
    theme: "ocstudio",
    appName: "Probe Operator",
  },
  {
    name: "probe-min",
    preset: "minimal",
    theme: "light",
    appName: "Probe Min",
  },
  {
    name: "probe-mon",
    preset: "monitoring",
    theme: "ocstudio",
    appName: "Probe Mon",
  },
  {
    name: "probe-setup",
    preset: "setup",
    theme: "ocstudio",
    appName: "Probe Setup",
  },
  {
    name: "probe-custom",
    preset: "technical-ribbon",
    theme: "ocstudio",
    with: ["ribbon"],
    without: ["inspector"],
    appName: "Probe Custom",
  },
];

function run(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message.split("\n").slice(0, 5).join(" ")
        : String(error);
    fail(`Self-test command failed in ${cwd}: ${cmd}\n${detail.slice(0, 500)}`);
  }
}

function expectContains(haystack: string, needle: string, what: string): void {
  if (!haystack.includes(needle)) {
    fail(
      `Self-test failure (${what}): expected to contain ${JSON.stringify(needle)}.`,
    );
  }
}

function checkCase(parent: string, kase: Case): void {
  const dest = join(parent, kase.name);
  const withFlag = kase.with?.length ? ` --with ${kase.with.join(",")}` : "";
  const withoutFlag = kase.without?.length
    ? ` --without ${kase.without.join(",")}`
    : "";
  console.log(
    `case: ${kase.name} (preset ${kase.preset}, theme ${kase.theme})`,
  );

  // Materialize the real project through the real generator.
  run(
    `bun ${join(SCRIPTS_DIR, "generate-project.ts")} -- ${kase.name} --preset ${kase.preset} --theme ${kase.theme}${withFlag}${withoutFlag} --app-name "${kase.appName}" --dest ${dest}`,
    REPO_ROOT,
  );
  if (!existsSync(join(dest, "src", "app", "workbench.config.ts"))) {
    fail(
      `Self-test failure (${kase.name}): workbench.config.ts was not materialized.`,
    );
  }

  // Final config reflects the requested combination.
  const config = readFileSync(
    join(dest, "src", "app", "workbench.config.ts"),
    "utf8",
  );
  expectContains(config, `appName: '${kase.appName}'`, `${kase.name} appName`);
  expectContains(config, `layout: '${kase.preset}'`, `${kase.name} layout`);
  expectContains(config, `theme: '${kase.theme}'`, `${kase.name} theme`);
  for (const id of kase.with ?? []) {
    expectContains(config, id, `${kase.name} with:${id}`);
  }
  for (const id of kase.without ?? []) {
    expectContains(config, id, `${kase.name} without:${id}`);
  }

  // Minimal derived project: only the kept preset+theme ship.
  for (const other of ALL_PRESET_IDS) {
    if (
      other !== kase.preset &&
      existsSync(join(dest, "src", "features", other))
    ) {
      fail(
        `Self-test failure (${kase.name}): pruned preset dir leaked: src/features/${other}.`,
      );
    }
  }
  if (existsSync(join(dest, "src", "features", "showcase"))) {
    fail(`Self-test failure (${kase.name}): showcase was not pruned.`);
  }
  if (!existsSync(join(dest, "src", "features", kase.preset))) {
    fail(
      `Self-test failure (${kase.name}): kept preset dir missing: src/features/${kase.preset}.`,
    );
  }
  for (const otherTheme of ALL_THEME_IDS) {
    if (otherTheme === kase.theme) {
      continue;
    }
    if (
      existsSync(join(dest, "src", "styles", "themes", `${otherTheme}.css`))
    ) {
      fail(
        `Self-test failure (${kase.name}): pruned theme leaked: src/styles/themes/${otherTheme}.css.`,
      );
    }
  }
  if (!existsSync(join(dest, "src", "styles", "themes", `${kase.theme}.css`))) {
    fail(`Self-test failure (${kase.name}): kept theme file is missing.`);
  }
  const router = readFileSync(join(dest, "src", "app", "router.tsx"), "utf8");
  for (const needle of [
    "showcase",
    "ControlsShowcase",
    "/demo/controls",
    // No preview bar in derived projects: DEMO-ONLY switchers, the
    // preview catalog, and the /presets/$presetId route are pruned.
    "PresetSwitcher",
    "ThemeSwitcher",
    "previewPresets",
    "PresetPreviewPage",
    "presetPreviewRoute",
    "/presets/$presetId",
    "workbenchThemes",
  ]) {
    if (router.includes(needle)) {
      fail(
        `Self-test failure (${kase.name}): staging router still references preview/demo code (${needle}).`,
      );
    }
  }
  if (/\bLink\b/.test(router)) {
    fail(
      `Self-test failure (${kase.name}): staging router still references preview/demo code (Link).`,
    );
  }
  expectContains(router, `"${kase.preset}"`, `${kase.name} router kept preset`);
  // RootLayout renders the Outlet directly; the index route renders the
  // single kept preset.
  expectContains(router, "<Outlet />", `${kase.name} router outlet`);
  expectContains(router, `path: "/"`, `${kase.name} router index`);

  // Source-only files stay out of derived projects; extension generators stay in.
  for (const sourceOnly of [
    "scripts/generate-project.ts",
    "scripts/scaffolding.test.ts",
    "scripts/self-test-scaffolding.ts",
    "docs/qa-factory-stability-checklist.md",
    "CHANGELOG.md",
  ]) {
    if (existsSync(join(dest, sourceOnly))) {
      fail(
        `Self-test failure (${kase.name}): source-only file leaked: ${sourceOnly}.`,
      );
    }
  }
  // The derived package.json drops the factory-only scripts, and the
  // derived README describes the app, not the factory.
  let derivedPkg: { scripts?: Record<string, string> };
  try {
    derivedPkg = JSON.parse(
      readFileSync(join(dest, "package.json"), "utf8"),
    ) as typeof derivedPkg;
  } catch {
    fail(
      `Self-test failure (${kase.name}): derived package.json is missing or invalid.`,
    );
  }
  for (const factoryScript of ["generate:project", "self-test:scaffolding"]) {
    if (derivedPkg.scripts?.[factoryScript] !== undefined) {
      fail(
        `Self-test failure (${kase.name}): factory script leaked: ${factoryScript}.`,
      );
    }
  }
  const readme = readFileSync(join(dest, "README.md"), "utf8");
  expectContains(readme, kase.appName, `${kase.name} readme app`);
  for (const needle of ["generate:project", "self-test"]) {
    if (readme.includes(needle)) {
      fail(
        `Self-test failure (${kase.name}): derived README references factory workflow (${needle}).`,
      );
    }
  }
  for (const kept of [
    "scripts/generate-feature.ts",
    "scripts/generate-widget.ts",
  ]) {
    if (!existsSync(join(dest, kept))) {
      fail(`Self-test failure (${kase.name}): derived project lost ${kept}.`);
    }
  }

  // Provenance marker.
  let marker: {
    schemaVersion: number;
    template: string;
    preset: string;
    theme: string;
  };
  try {
    marker = JSON.parse(
      readFileSync(join(dest, ".boilerplate.json"), "utf8"),
    ) as typeof marker;
  } catch {
    fail(
      `Self-test failure (${kase.name}): .boilerplate.json is missing or invalid.`,
    );
  }
  if (
    marker.template !== "tanstack-desktop-workbench" ||
    marker.schemaVersion !== 1 ||
    marker.preset !== kase.preset ||
    marker.theme !== kase.theme
  ) {
    fail(
      `Self-test failure (${kase.name}): invalid .boilerplate.json: ${JSON.stringify(marker)}.`,
    );
  }

  // Generated AI context describes the derived app and is fresh.
  if (!existsSync(join(dest, "docs", "ai", "generated-context.md"))) {
    fail(`Self-test failure (${kase.name}): generated AI context is missing.`);
  }
  run(`bun ${join(dest, "scripts", "generate-ai-context.ts")} --check`, dest);
  const context = readFileSync(
    join(dest, "docs", "ai", "generated-context.md"),
    "utf8",
  );
  expectContains(context, kase.preset, `${kase.name} context preset`);
  expectContains(context, kase.appName, `${kase.name} context app`);

  // Derived generators still work (dry-run renders against the derived sources).
  run(
    `bun ${join(dest, "scripts", "generate-feature.ts")} -- ${kase.name}-extra --dry-run`,
    dest,
  );
  console.log(`ok: ${kase.name}`);
}

function checkTypecheck(parent: string): Promise<void> {
  const repoModules = join(REPO_ROOT, "node_modules");
  if (!existsSync(repoModules)) {
    fail(
      "Self-test failure: boilerplate node_modules missing (run bun install first).",
    );
  }
  // Read-only links: every derived case typechecks against the real
  // dependency tree without installing anything into the temp fixtures.
  // Isolation (verified before parallelizing): each case owns
  // parent/<case.name>/ (cwd + node_modules symlink), no shared fixture
  // dirs, no ports, no global state; the only shared path is the
  // read-only repoModules/.bin/tsc binary. Safe to run in parallel.
  async function checkOneTypecheck(kase: Case): Promise<string> {
    const dest = join(parent, kase.name);
    const started = Date.now();
    symlinkSync(repoModules, join(dest, "node_modules"), "dir");
    try {
      try {
        await execAsync(`${join(repoModules, ".bin", "tsc")} --noEmit`, {
          cwd: dest,
        });
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message.split("\n").slice(0, 5).join(" ")
            : String(error);
        throw new Error(
          `Self-test command failed (${kase.name}) in ${dest}: tsc --noEmit\n${detail.slice(0, 500)}`,
        );
      }
    } finally {
      rmSync(join(dest, "node_modules"), { force: true });
    }
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    return `ok: typecheck of derived ${kase.name} (${elapsed}s)`;
  }

  async function runBounded(): Promise<void> {
    const totalStarted = Date.now();
    const queue = [...CASES];
    const failures: string[] = [];
    async function worker(): Promise<void> {
      while (queue.length > 0) {
        const kase = queue.shift();
        if (!kase) {
          return;
        }
        try {
          console.log(await checkOneTypecheck(kase));
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }
    }
    const workers = Math.min(TYPECHECK_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
    const totalElapsed = ((Date.now() - totalStarted) / 1000).toFixed(1);
    console.log(
      `ok: typechecks of ${CASES.length} cases (total ${totalElapsed}s, concurrency ${workers})`,
    );
    if (failures.length > 0) {
      fail(
        `Self-test failure: ${failures.length} derived typecheck(s) failed:\n${failures.join("\n")}`,
      );
    }
  }

  return runBounded();
}

function checkDerivedFeatureLoop(parent: string): void {
  const dest = join(parent, "probe-custom");
  run(
    `bun ${join(dest, "scripts", "generate-feature.ts")} -- machine-control`,
    dest,
  );
  if (
    !existsSync(join(dest, "src", "features", "machine-control", "feature.ts"))
  ) {
    fail(
      "Self-test failure (probe-custom): derived generate:feature wrote nothing.",
    );
  }
  run("bun run ai:context", dest);
  run(`bun ${join(dest, "scripts", "generate-ai-context.ts")} --check`, dest);
  const context = readFileSync(
    join(dest, "docs", "ai", "generated-context.md"),
    "utf8",
  );
  expectContains(context, "machine-control", "probe-custom context extension");
  console.log("ok: derived generate:feature + ai:context loop");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (printHelpIfRequested(argv, SCRIPT, spec, EXAMPLES)) {
    return;
  }
  try {
    parseArgs(argv, spec);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const parent = mkdtempSync(join(tmpdir(), "wb-self-test-"));
  try {
    for (const kase of CASES) {
      checkCase(parent, kase);
    }
    await checkTypecheck(parent);
    checkDerivedFeatureLoop(parent);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
  console.log(
    `self-test:scaffolding passed (${CASES.length} cases + derived typechecks + feature loop).`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
