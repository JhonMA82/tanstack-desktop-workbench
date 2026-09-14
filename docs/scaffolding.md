# Scaffolding

Declarative generators over the workbench vocabulary (presets, features,
widgets, commands, tools, status items, themes). Small CLI helpers live in
`scripts/_lib/` (`cli`, `files`, `naming`, `templates`); no CLI framework.

## CLI conventions

Every generator supports positionals, `--flag value`, `--flag=value`,
boolean flags, `--no-*` negation, `--help`, `--dry-run` (validate and
report without writing), and `--force` (overwrite). Errors are readable
and exit code 2, so Engineering Platform can invoke them non-interactively
with deterministic arguments. No interactive prompts, ever.

## generate:project

Materializes a derived application from this boilerplate:

```bash
bun run generate:project -- printnc-control \
  --preset ide \
  --theme ocstudio \
  --with console \
  --without notifications \
  --app-name "PrintNC Control" \
  --dest ../printnc-control \
  --install --git
```

| Flag | Meaning |
| --- | --- |
| `<name>` | Project/package name (kebab-case) |
| `--preset` | Layout preset id (default: `technical-ribbon`) |
| `--with-presets` | Extra presets to keep (repeatable, comma-separated; validated against real ids) |
| `--theme` | Theme id (default: `ocstudio`) |
| `--with` / `--without` | Feature adjustments (repeatable, comma-separated) |
| `--app-name` | Display name (default: Title Case of name) |
| `--dest` | Destination dir (default: `../<name>`) |
| `--force` | Replace destination (only with a valid marker, see below) |
| `--install` / `--git` | Run `bun install` / `git init` in the new project |
| `--dry-run` | Validate and report without writing |

Validation is data-driven and runs BEFORE anything is written: preset ids
come from the real `*Preset.ts` modules, themes from `workbenchThemes`
(`src/app/workbench.config.ts`), features from `KNOWN_FEATURES` plus the
fail-fast resolver (`resolveFeaturesOrThrow`: unknown ids, `with`/`without`
overlap, unhostable features, disabled load-bearing capabilities). Invalid
combinations abort with a readable error; nothing is materialized.

Materialization is atomic: validate args → stage into a sibling temp dir
(`.scaffold-staging-<name>-<pid>`) → copy sources minus source-only files
→ transform identity (`package.json` name, `workbench.config.ts`
manifest, `.boilerplate.json` marker) → move staging to the destination
last. On failure the staging dir is removed; a previous destination is
never touched and no half-project is left behind.

## --force policy

`--force` never deletes arbitrary directories. Without `--force`, a
non-empty destination aborts. With `--force`, replacement happens only
when the destination carries a valid `.boilerplate.json` marker with
`"template": "tanstack-desktop-workbench"`; otherwise the command refuses
and the destination stays intact.

## .boilerplate.json

Provenance marker written into every derived project:

```json
{
  "schemaVersion": 1,
  "template": "tanstack-desktop-workbench",
  "sourceVersion": "0.1.0",
  "sourceCommit": "e9c4266",
  "preset": "technical-ribbon",
  "theme": "ocstudio"
}
```

        ## Source-only vs derived files
    
        These belong to the boilerplate source but NOT to derived projects:
    
        - `scripts/generate-project.ts` — the project materializer itself
        - `scripts/scaffolding.test.ts` — the boilerplate scaffolder unit tests
        - `scripts/self-test-scaffolding.ts` — the factory self-test (materializes
          temp projects; meaningless once there is no materializer left)
        - `docs/qa-factory-stability-checklist.md` — factory QA checklist
        - `CHANGELOG.md` — boilerplate release history, not the app's history
        - `.codegraph/` — local index state
    
        Derived projects KEEP the extension generators (`generate:feature`,
        `generate:widget`, `generate:command`, `generate:tool`,
        `generate:status-item`, `generate:preset`) plus `scripts/_lib/`,
        `generate-ai-context.ts` (+ test), `validate-architecture.ts` /
        `validate-workbench.ts` (+ the aggregated `validate` script), `docs/presets.md`,
        `docs/ai/*`, and `AGENTS.md`, so the app can keep extending and
        validating itself; the root finder accepts a valid `.boilerplate.json`
        marker for exactly this reason. The derived `package.json` also drops
        the factory-only scripts (`generate:project`, `self-test:scaffolding`)
        whose files no longer exist there, and the factory `README.md` is
        replaced by a minimal app README (name, preset+theme+features,
        commands, doc pointers).
    
        > The `generate:project` and `self-test:scaffolding` sections of this
        > document describe the SOURCE (factory) workflows. They do not apply
        > inside a derived project: the materializer and the self-test are
        > pruned there, so those commands simply do not exist in the derived app.

    ## Minimal derived projects (pruning)

    A derived project ships ONLY the kept presets (`--preset` plus
    `--with-presets`, one preset when the flag is absent) and the chosen
    theme. The prune runs as a transform step on the STAGING copy
    (`pruneStagingToMinimal` in `scripts/generate-project.ts`); the
    `SOURCE_ONLY` set above stays unchanged and the boilerplate source keeps
    all 10 presets and both themes (`bun run validate` stays green there).

    Switching presets inside a derived app is configuration, not generation:
    set the `layout` key in `src/app/workbench.config.ts` to any kept preset
    id (the `WorkbenchLayoutId` union lists exactly the kept ones; the router
    maps every kept preset), then run `bun run ai:context` to refresh the
    generated context. The preview bar is still removed: with no gallery to
    browse, the DEMO-ONLY `PresetSwitcher`/`ThemeSwitcher` and the
    `/presets/$presetId` route have nothing to do in the derived app.

        What is pruned (staging only):
    
        - Factory-only files (`SOURCE_ONLY` above): `scripts/generate-project.ts`,
          `scripts/scaffolding.test.ts`, `scripts/self-test-scaffolding.ts`,
          `docs/qa-factory-stability-checklist.md`, `CHANGELOG.md`, plus local
          `.codegraph/` index state.
        - `package.json`: the `generate:project` and `self-test:scaffolding`
          scripts are removed (their files no longer exist in the derived app).
        - `README.md`: the factory README is replaced by a minimal derived-app
          README (app name, resolved preset+theme+features, useful commands,
          pointers to `docs/scaffolding.md` and `docs/ai/generated-context.md`).

    - `src/features/`: every known preset dir except the kept ones, always
      plus `src/features/showcase/` (internal demos). With `--with-presets
      ide,studio`, only `technical-ribbon` (the manifest preset), `ide`
      and `studio` ship. Custom feature dirs created via `generate:feature`
      are NOT in the known-preset list and are kept — pruning never
      deletes app extensions.
    - `src/styles/themes/`: every `<theme>.css` except the chosen one
      (`tokens.css` and `global.css` stay; `global.css` is rewritten to import
      only the kept theme).
    - `src/app/router.tsx`: `presetComponents` collapses to the kept
      presets (one entry without `--with-presets`); the `/demo/controls`
      route, its `ControlsShowcase` import, and the demo `Link` are
      removed. The app boots into its manifest preset with no demo nav.
    - `src/app/router.tsx` (preview bar): the derived app ships NO preview
      chrome. The DEMO-ONLY `PresetSwitcher` (preset links) and
      `ThemeSwitcher` definitions and usages are deleted, the whole
      `previewPresets` catalog goes with them, and the `/presets/$presetId`
      route (`presetPreviewRoute` + `PresetPreviewPage` + route-tree entry)
      is removed — with one preset there is nothing to preview. `RootLayout`
      keeps the stored-theme init + `ErrorBoundary` and renders the `Outlet`
      directly; the index route renders the single kept preset. Every step is
      guarded: if the source router template drifts, the transform fails
      loudly instead of leaking preview UI (plus a final containment guard
      over preview/demo identifiers and a positive guard over
      `<Outlet />`/`ErrorBoundary`/kept preset). Stale derived routers are
      never silently accepted.
    - Catalog enumerations: `src/app/workbench.config.ts` collapses
      `WorkbenchLayoutId` to the kept preset union (`"ide"` alone, or
      `"technical-ribbon" | "ide"` with `--with-presets ide`) and
      `ThemeId`/`workbenchThemes` to the single kept theme.
    - Catalog tests are adapted, never deleted without replacement:
      `src/workbench/presets.test.ts` and `src/app/workbench.config.test.ts`
      assert the pruned catalog; `src/styles/themes/theme-parity.test.ts`
      discovers theme files dynamically; `scripts/ai-context.test.ts` asserts
      the derived name/preset/theme; `scripts/validate-architecture.ts` probes
      `--feature <kept-preset>`. The derived project passes `bun test` and
      `tsc --noEmit` (plus `validate:workbench`, `validate:architecture` and
      `ai:context:check`).

    Gallery vs library (controls): the `/demo/controls` route and
    `src/features/showcase/` are a visual GALLERY and are pruned from derived
    projects; the LIBRARY (`src/components/workbench/primitives/`) is shared
    core and is always kept (protected core, never pruned — available in every
    preset). Agents build forms/tables/dialogs from the library via the
    "Controls library" catalog in `docs/ai/generated-context.md` (recipes in
    `docs/ai/canonical-examples.yaml`) instead of inventing styles; raw
    `<button>`/`<table>`/`<input>`/`<select>`/`<textarea>` in `src/features/**`
    fail `validate:architecture`.

    Demo-import strategy (verified by grep on the real source, no rewrites needed):

    - No preset workbench imports `src/features/showcase/*` — only the router
      does (removed above). The ide/studio/operator/technical-ribbon "demo"
      imports resolve to `src/components/workbench/widgets/DemoWidgets.tsx`,
      which is core and is KEPT; monitoring/setup ship their own local demo
      data (`monitoringDemo.ts`, `setupDemo.ts`) inside their own kept
      directory. A staging guard fails loudly if a kept preset ever imports
      showcase code again.
    - Registry demo content (widget/command/tool/status registrations) lives
      mostly in the `technicalRibbon*` preset files, so non-ribbon derived
      catalogs legitimately list few or no registrations; the workbenches
      render components directly and the app re-registers via the kept
      extension generators.

    ## Tool shortcuts select their tool (technical-ribbon)

    In the source, `registerTechnicalRibbonCommands(commands, status, tools)`
    wires every command that resolves to a tool to SELECT that tool through
    the `ToolRegistry` (third parameter, defaults to `globalTools`) instead
    of running a no-op: `draw.line`→`line` (L), `draw.circle`→`circle` (C),
    `modify.move`→`move` (M), `view.zoom`→`zoom` (Z), `view.pan`→`pan` (P),
    `tool.select`→`select` (V), and so on for every tool-backed command.
    Resolution is lazy at execute time (commands register before tools) and
    guarded by the registry: a command with no tool stays a documented
    no-op (`view.reset`, `view.zoom-in/out`, …), `app.*` commands never
    hijack the active tool (`app.load`, `app.script`, …), and the
    `grid`/`ortho`/`osnap` toggles (G/F8/F3) keep flipping the status
    registry. Selection is tracked per tool-registry instance in the preset
    module (fresh registries in tests stay isolated from the globals); see
    `src/features/technical-ribbon/technicalRibbonCommands.test.ts`.
    Derived technical-ribbon apps inherit the wiring through the kept preset
    files — no generator flag needed.

    Browser check (source or derived technical-ribbon app): focus the page
    body (not an input) and press a shortcut, then move the pointer over the
    viewport so live regions re-render and confirm:

    | Key | Expected effect |
    | --- | --- |
    | L | `draw.line` executes and `line` is recorded as the selected technical-ribbon tool (proven by `technicalRibbonCommands.test.ts`) |
    | C | `circle` recorded as selected |
    | M | `move` recorded as selected |
    | Z | `zoom` recorded as selected |
    | P | `pan` recorded as selected |
    | V | `select` recorded as selected |
    | G | viewport grid appears/disappears (`GRID` toggle pill in the status bar flips) |
    | F8 | `ORTHO` toggle pill flips |
    | F3 | `OSNAP` toggle pill flips |

    > Scope note: the recorded selection lives in the preset module (per tool
    > registry, core untouched by design). Promoting it into the
    > Ribbon/ToolRail highlight on every keypress needs a small shell sync
    > mounted inside `TechnicalRibbonWorkbench` — a follow-up outside the
    > file scope of this change. Until then, shortcut selection is
    > state-proven (unit test) rather than highlight-visible.
    >
    > Derived apps keep the minimal wiring only: `draw.line`→`line` (L),
    > `draw.circle`→`circle` (C), `tool.select`→`select` (V), and the `grid`
    > toggle (G). See "Clean by default" above.

    ## Clean by default: one working example per extension point

    Derived projects ship NO demo content — they ship one minimal,
    end-to-end example per extension point with real behavior, so the app
    starts clean and every pattern is learnable from a single place:

    - Viewport: empty. `DemoGeometry.tsx` is deleted and the layout renders
      a bare `Viewport` (grid + coords chrome intact, driven by the `grid`
      status toggle). App renderers go where the demo used to be.
    - Ribbon (technical-ribbon): 1 tab (`Home`) with 1 group (`Draw`) and 3
      tools (`select`, `line`, `circle`). The rail carries the same 3 tools.
      Why these three: `select` is the idle tool every workbench needs, and
      `line`/`circle` prove the full loop (ribbon tab → tool def → command
      with shortcut → `ToolRegistry` selection → status toggle) with the
      smallest coherent set.
    - Commands (technical-ribbon): `tool.select` (V), `draw.line` (L),
      `draw.circle` (C) — each selecting its tool through the `ToolRegistry`
      (same lazy, per-registry selection mechanism as the source) — plus
      `grid.toggle` (G) flipping the `grid` status item. The ~40 demo noop
      commands (Annotate/View/Manage tabs, `app.*` actions, zoom variants)
      are removed with the tabs that referenced them.
    - Widgets (technical-ribbon): 1 visible inspector widget (`properties`,
      the real `PropertiesWidget`). No hidden demo widgets.
    - Status (technical-ribbon): 1 real toggle (`grid`, driving
      `ViewportGrid` visibility). `ortho`/`osnap` go with the demo.

    Coherence is enforced structurally: every ribbon/rail tool id exists in
    the tool defs, every tool command is registered, and no unused imports
    survive — the derived project passes strict `tsc`, lint, and its own
    trimmed `technicalRibbonCommands.test.ts` (same selection/sync/guard
    coverage, minimal command set).

    Other presets (`ide`/`studio`/`operator`/`monitoring`/`setup`/`minimal`/
    `forms`/`records`/`settings`)
    carry no demo command catalog (verified by grep: `ide`/`studio`/
    `operator` render `DemoWidgets` widget components structurally with no
    demo command/tool registrations and no `DemoGeometry`;
    `monitoring`/`setup` ship local structural data — `monitoringDemo.ts`
    tile/alert types, `setupDemo.ts` wizard validation; `minimal`/
    `forms`/`records`/`settings` are clean),
    so they are kept as-is — only `technical-ribbon` is rewritten.

    The derived AI context reflects the trimmed preset automatically: it is
    discovered from the real derived state (registries, preset files), never
    hand-listed — e.g. a clean technical-ribbon app reports `widgets:
    properties`, `commands: 4 registered`, `tools: circle, line, select`.

    `--dry-run` prints the prune plan (kept presets, feature dirs, theme
    files, rewritten files) plus the cleanup summary (what the demo cleanup
    trims and deletes); `--force` keeps its marker-only policy unchanged.

## Adding a boilerplate preset to a derived project

A derived project generated with one preset can gain more boilerplate presets later:

```bash
bun run generate:add-preset -- --from ../tanstack-desktop-workbench --preset ide
bun run generate:add-preset -- --from ../tanstack-desktop-workbench --preset ide,studio --dry-run
```

| Flag | Meaning |
| --- | --- |
| `--from` | Boilerplate source directory (must hold `src/features/<id>/*Preset.ts` for each id) |
| `--preset` | Preset id(s) to add (repeatable, comma-separated; validated against the source ids) |
| `--force` | Replace an existing `src/features/<id>` dir and re-apply router wiring |
| `--dry-run` | Validate and report without writing |

Behavior: validates every id against the source `src/features/<id>/*Preset.ts` files (unknown ids fail loudly), copies each `src/features/<id>` tree (refuses existing dirs without `--force`), patches `src/app/router.tsx` (component import plus side-effect preset import plus `presetComponents` entry with exact-match drift guards), widens the `WorkbenchLayoutId` union in `src/app/workbench.config.ts`, updates the catalog assertions in `src/workbench/presets.test.ts`, `src/app/workbench.config.test.ts`, and `scripts/ai-context.test.ts` (fail-loud guards covering both source-shape and pruned derived-shape files), updates the `.boilerplate.json` kept-preset list when present, and refreshes AI context. Never touches themes, shell core, or existing preset files.

### --with-presets versus add-preset

- `--with-presets` (on `generate:project`) keeps extra presets at materialization time: the derived project ships with all of them from the start.
- `generate:add-preset` adds boilerplate presets after materialization: use it when the derived project already exists and needs another preset from the boilerplate checkout.

Both paths converge on the same wiring (copied feature dir, router entry, widened union, updated catalog tests, refreshed context); switching between kept presets stays a `layout` edit in `src/app/workbench.config.ts`.

## Extension generators

```bash
bun run generate:feature -- machine-control
bun run generate:command -- connect-machine --feature machine-control
bun run generate:widget -- telemetry --dock right --feature machine-control
bun run generate:tool -- connect --command connect-machine --group machine --feature machine-control
bun run generate:status-item -- connection-state --kind readout --feature machine-control
bun run generate:preset -- custom-layout
```

- `generate:feature` scaffolds `src/features/<name>/` (`index.ts`,
  `feature.ts`, `commands.ts`, `tools.ts`) wired through the extensible
  feature registry. No domain logic, only registration; call the exported
  `register<Name>()` from the app entry, never from the core.
- `generate:widget` takes `--dock left|right|bottom|floating|hidden`,
  `--title`, `--feature`. Creates the component (workbench `--wb-*` tokens
  only) plus a registration module. Never edits `WorkbenchShell`; render
  with `<WidgetHost widgetId="..." />`.
- `generate:command` creates a sync/async registered action with `label`,
  optional `shortcut`, and feature owner. Never inserts logic into the
  Ribbon; tools, shortcuts, and the palette resolve the same command id.
- `generate:tool` takes `--command` (required), `--group`, `--shortcut`,
  `--feature` (required). Declarative: resolves the command, holds no
  logic. Warns when the command is not registered anywhere under `src/`.
- `generate:status-item` takes `--kind toggle|readout` and `--feature`.
- `generate:preset` scaffolds a coherent `LayoutPreset` module (per-preset
  load-bearing via the optional `loadBearing` field — `viewport` by
  default, `form`/`data-table` for viewport-free presets — every default
  hosted). Adding it to `presetComponents` in
  `src/app/router.tsx` stays an explicit manual step.

Every generator prints next steps after succeeding. AI context refresh is
automatic: every generator runs `bun run ai:context` on success (including
`generate:project`, which regenerates the context inside the derived
project so it describes the new application, not the boilerplate catalog).
If the refresh itself fails, the generator fails — context drift is never
left silent.

## Engineering Platform invocation

The CLI is the contract: non-interactive, deterministic, no prompts, exit 0
on success and exit 2 with a readable error on failure. An EP resolution
maps 1:1 to flags:

```json
{
  "boilerplate": "tanstack-desktop-workbench",
  "projectName": "printnc-control",
  "preset": "technical-ribbon",
  "theme": "ocstudio",
  "with": [],
  "without": ["inspector"]
}
```

```bash
bun run generate:project -- printnc-control \
  --preset technical-ribbon \
  --theme ocstudio \
  --without inspector \
  --app-name "PrintNC Control" \
  --dest ../printnc-control
```

Validate first without writing via `--dry-run`; the same flags then
materialize the validated combination (only `.boilerplate.json`
provenance differs per source state).

## Idempotency and safety

- Generators never overwrite: existing files/destinations abort unless
  `--force` is passed (exit 2, destination untouched).
- `--force` on `generate:project` only replaces destinations carrying a
  valid `.boilerplate.json` marker from this template — never arbitrary
directories.
- Validation runs BEFORE any write: unknown presets/themes/features,
  `with`/`without` overlap, unhostable features, and disabled load-bearing
  capabilities abort before the staging dir is even created.
- Materialization is staged (sibling temp dir) and moved last; failures
  remove the staging dir and never leave a half-generated project.
- Extension generators fail on unknown `--feature` owners and print
  `--force` guidance on conflicts instead of merging ambiguously.

## workbench.config.ts

`src/app/workbench.config.ts` is the declarative application manifest
(`appName`, `layout`, `theme`, `with`, `without`). `generate:project` is
the materializer; editing values in the manifest is normal configuration,
not generation.
