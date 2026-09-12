# TanStack Workbench

Extensible desktop-style workbench boilerplate: React + TypeScript strict + Vite (client-side SPA),
code-based TanStack Router, Tailwind CSS v4, lucide-react icons, Biome, `bun test`.
Default visual preset: **Technical Ribbon** (`src/features/technical-ribbon`).

## 1. What it is

A clone-ready shell for technical desktop-like web apps: composed Ribbon/ToolRail/Viewport/
Inspector/CommandBar/StatusBar built from small primitives and driven by registries.
The core knows nothing about technical drawing; the technical-ribbon preset is one feature folder.

## 2. App types it targets

CAD/CAM/CNC, engineering tools, graphic editors, industrial apps, GIS, simulators,
node editors, IDE-like tools, config tools, monitoring/control, specialized technical software.

## 3. Architecture

```
primitives <- shell / viewport / widgets <- registries / commands / layouts <- features
```

- `src/components/workbench/primitives` — generic visual language (zero domain knowledge).
- `src/components/workbench/{shell,viewport,widgets}` — composed workbench components.
- `src/workbench` — types + command/tool/widget/status/layout registries (React context).
- `src/features/<app>` — preset wiring: registers entries, provides page content.
- `src/styles` — tokens + themes. Components consume `var(--wb-*)` only.

Dependency direction is one-way; features never leak into the core.

## 4. Shell

`WorkbenchShell > Ribbon + Workspace(ToolRail | Viewport | Inspector) + CommandBar + StatusBar`.
Compose it in a preset file (see `src/features/technical-ribbon/technicalRibbonLayout.tsx`); the shell files stay untouched.
The shell is fullscreen without OS window chrome: traffic lights and minimize/maximize/close
buttons are gone by design — the web demo has no OS window to control.

## 5. Widgets

`registerWidget({ id, title, icon, component, defaultPosition, defaultSize?, minSize?, closable?, resizable?, visible? })`.
Positions: `left | right | bottom | floating | hidden` (docking-ready, no DnD yet).
Render via `<WidgetHost widgetId="..." />`; visibility via `useWidgets()` (`show/hide/toggle`).

## 6. Commands

`registerCommand(id, execute, { label?, shortcut? })`. UI never holds logic; tools and the
command bar resolve ids through `useCommands().execute(id, args?)`.
Unknown ids return `false`; duplicates throw; executions are recorded in `history()`.

### Command palette and keyboard shortcuts

Press `Ctrl+K` (or `Cmd+K` on macOS) anywhere — or click the `⌘K` badge in the
command bar — to open the command palette: a filterable overlay over every
registered command. Type to filter by id/label/shortcut (prefix matches rank
first), navigate with `Up/Down/Home/End`, `Enter` runs the selected command,
`Esc` or backdrop click closes. Focus returns to the previous element on close.

How shortcuts resolve (`src/workbench/shortcuts.ts` + `ShortcutProvider`,
mounted once inside `WorkbenchShell`):

- One canonical string per command: bare keys (`"G"`, `"F8"`), combos
  (`"Ctrl+K"`, `"Ctrl+Shift+Z"`), or names (`"Escape"`, `"Delete"`).
- `Ctrl` and `Cmd` are the same modifier, so `"Ctrl+K"` works on all platforms.
- A global `keydown` listener matches the pressed combo against commands
  carrying a `shortcut` and runs the SAME command object the buttons use.
- Input-focus guard: when focus is in an `input`/`textarea`/`select` (or
  `contentEditable`), every shortcut is ignored EXCEPT the palette toggle
  (`Ctrl/Cmd+K`). `Esc` closes the palette. Repeated keydown events never
  double-fire (`e.repeat` guard).

Assigned shortcuts (technical-ribbon demo; all execute the registered command):

| Shortcut | Command | Effect |
| --- | --- | --- |
| `Ctrl/Cmd+K` | `command-palette.toggle` | Open/close palette |
| `V` / `L` / `C` / `M` | `tool.select` / `draw.line` / `draw.circle` / `modify.move` | Select tool (fires its command) |
| `Z` / `P` | `view.zoom` / `view.pan` | Zoom / Pan |
| `G` / `F8` / `F3` | `grid.toggle` / `ortho.toggle` / `osnap.toggle` | Flip status toggles |
| `Esc` | — | Close palette |

How to add a shortcut to a command (one snippet):

```tsx
globalCommands.registerCommand("view.reset", resetCamera, {
  label: "Reset view",
  shortcut: "R", // bare key, or "Ctrl+R" for a combo
});
```

## 7. Tools

`registerTool({ id, label, icon, tooltip?, command, group?, shortcut? })`.
`ToolProvider` tracks `activeToolId`; `selectTool(id)` activates and fires the tool's command.

## 8. Ribbon

Data-driven: `RibbonTab[]` (`tabs -> groups -> tool ids`), first tool per group renders large.
`technicalRibbonRibbon.ts` is the model; `<Ribbon tabs={...} />` resolves tools from the registry.

## 9. Layouts

`LayoutPreset` (`slots` + `defaultFeatures`, see `src/workbench/types.ts`) is the
single canonical model: a preset declares composition (which capability ids
live in each `top | left | center | right | bottom` slot plus default
features); it never implements domain logic. Seven presets compose the same
shell: `technical-ribbon`, `ide`, `studio`, `operator`, `monitoring`,
`setup`, `minimal` (see `docs/presets.md`). `LayoutDefinition`
(`railTools` / `rightWidgets` / `bottomWidgets`) survives only as a derived
legacy view (`globalLayouts` is a thin adapter over the preset store).

## 10. Themes

Tokens in `src/styles/tokens.css`, values per theme in `src/styles/themes/*.css`.
Available themes: `ocstudio` (dark default, set on `<html>` in `index.html`)
and `light`. New themes override tokens only — no component changed for `light`,
which is the proof of the token architecture.

Switch at runtime with the DEMO-ONLY Theme switcher in the preview bar
(`ocstudio | light`); the choice persists through the existing theme
write-back (`saveWorkspaceState`), stored themes outside the manifest
`ThemeId` union fall back to the manifest default with a `console.warn`.
`src/styles/themes/theme-parity.test.ts` asserts every theme file defines
the same `--wb-*` set, so a missing token fails the suite.

## 11. How to add a widget

```bash
bun run generate:widget -- telemetry --dock right --feature myapp
```

Or manually:

```tsx
// src/features/myapp/myWidgets.ts
import { globalWidgets } from "../../workbench/widgets";
globalWidgets.registerWidget({
  id: "telemetry",
  title: "Telemetry",
  icon: Activity,
  component: TelemetryWidget,
  defaultPosition: "right",
  closable: true,
  visible: true,
});
```

## 12. How to add a tool

```bash
bun run generate:tool -- measure --command measure.distance --group inspect --feature myapp
```

Or manually:

```tsx
globalTools.registerTool({
  id: "measure",
  label: "Measure",
  icon: Ruler,
  command: "measure.distance",
  group: "inspect",
  shortcut: "D",
});
globalCommands.registerCommand("measure.distance", runMeasure, { label: "Measure distance" });
// Reference "measure" from a ribbon group or rail list. No shell edits.
```

## 13. How to add a command

```bash
bun run generate:command -- reset-view --feature myapp --shortcut R
```

Or manually:

```tsx
globalCommands.registerCommand("view.reset", resetCamera, { label: "Reset view", shortcut: "R" });
```

## 14. How to create a layout

```bash
bun run generate:preset -- monitoring
```

Scaffolds `src/features/<name>/<name>Preset.ts` with a coherent
`LayoutPreset` (`slots` + `defaultFeatures`) and a guarded
`register<Name>Preset()`. Then wire the composition manually: create the
workbench component, add the id to `WorkbenchLayoutId` and one entry to
`presetComponents` in `src/app/router.tsx` (explicit on purpose).

## Scaffolding a new application

```bash
bun run generate:project -- printnc-control \
  --preset technical-ribbon --theme ocstudio --without inspector

cd ../printnc-control

bun run generate:feature -- machine-control
bun run generate:command -- connect-machine --feature machine-control
bun run generate:widget -- telemetry --dock right --feature machine-control
bun run generate:tool -- connect --command connect-machine --group machine --feature machine-control
```

`generate:project` validates preset/theme/features against the real
registries before writing, stages in a sibling temp dir, and moves to the
destination only at the end (`--force` replaces just projects carrying a
valid `.boilerplate.json` marker). Full reference: `docs/scaffolding.md`.

## Layout vs Features

- **Layout** (`LayoutPreset` in `src/workbench/types.ts`, stored via
  `src/workbench/layouts.ts`): how the app is organized visually — which
  capability ids live in each `top | left | center | right | bottom` slot.
  Presets declare composition; they never implement domain logic.
- **Features** (`FeatureId`, `resolveFeatures` in `src/workbench/features.ts`):
  what the app includes (`ribbon`, `tool-rail`, `viewport`, `inspector`,
  `command-bar`, `statusbar`, plus `explorer`, `console`, `output`,
      `bottom-panel`, `activity-bar`, `tabs`, `toolbar`, `notifications`,
      `command-palette`, `secondary-sidebar`, plus the operation/studio
      capabilities (`navigation`, `controls`, `alarms`, `system-status`,
      `hierarchy`, `timeline`, `workspace-selector`, plus the
      monitoring observe-only capabilities (`system-summary`,
      `source-nav`, `tile-wall`, `alert-strip`, `event-stream`, plus the
      step-driven wizard capabilities (`step-rail`, `wizard-nav`)).
    Full catalog, composition sketches, and how-to guides live in
    [`docs/presets.md`](docs/presets.md).

A preset enables features by default, but layout and features are not the
same concept: the same feature (e.g. `inspector`) can be hosted by different
slots of different presets.

## App manifest

`src/app/workbench.config.ts` is the declarative application manifest
(`appName`, `layout`, `theme`, `with`, `without`). `generate:project` is
the materializer; editing values here is normal configuration. Full
generator reference: `docs/scaffolding.md`.

```ts
export const workbenchConfig = {
  appName: "Technical Workbench",
  layout: "technical-ribbon",
  // with: ["explorer"],
  // without: ["inspector"],
  theme: "ocstudio",
};
```

The main route renders the manifest's layout with resolved features.

## AI context

`docs/ai/generated-context.md` is generated from the real repo state — never
edited by hand. It tells an agent what app this is, which preset/theme is
active, which features resolved, and what is registered (widgets, commands,
tools, status items, presets). Minimal reading path: `AGENTS.md` →
generated context → `docs/ai/project-map.yaml` → at most 1–2 canonical
examples → the files directly affected.

```bash
bun run ai:context        # regenerate after config/extension changes
bun run ai:context:check  # fail when the file drifts (CI gate)
```

Every generator (`generate:project`, `generate:feature`, `generate:widget`,
`generate:command`, `generate:tool`, `generate:status-item`,
`generate:preset`) refreshes the context automatically on success.

## Validation

```bash
bun run validate  # lint + typecheck + tests + validate:architecture +
                  # validate:workbench + ai:context:check + build
```

Targeted checks: `bun run validate:architecture` (core/feature isolation,
`--wb-*` tokens, command delegation, duplicate ids, preset resolution, theme
parity, template tokens) and `bun run validate:workbench` (manifest against
the real registries). `bun run self-test:scaffolding` materializes temp
projects and verifies real generation contracts. A change is done only when
`bun run validate` is green — a compiling project with stale AI context or
an invalid reference is NOT done.

## Workspace persistence

Runtime workspace state persists in `localStorage` via
`src/workbench/persistence.ts` (schema v1, key `tanstack-workbench:v1`).
No UI changes: hydration and write-through are invisible behavior.

What persists:

| Key | Source | Written when |
| --- | --- | --- |
| `theme` | applied `<html>` theme | theme is applied |
| `layoutId` | active layout preset | a `/presets/<id>` preview is visited |
| `with` / `without` | feature overrides | programmatically via `saveWorkspaceState` |
| `widgetsVisible` | widget visibility map | a widget is shown/hidden/toggled |
| `statusToggles` | status toggle map | a status item is toggled |
| `panelSizes` | reserved slot | nothing writes it yet (read/merged for future resizable panels) |

Precedence: stored values win over the manifest defaults (`src/app/workbench.config.ts`
 stays the default for fresh users); visibility records merge per key so newly
 registered widgets/status items keep their defaults. Corrupt JSON, missing data,
 version mismatches, and storage exceptions (private mode, SSR) all fall back to
 defaults and never throw. A stored `layoutId` or `with`/`without` combo that fails
 validation falls back to the manifest with a `console.warn`, never a broken screen.

Reset: delete the `tanstack-workbench:v1` key in devtools, or call
 `clearWorkspaceState()` from `src/workbench/persistence.ts`.

## with / without semantics and validation

- `with` enables extra features on top of the preset defaults.
- `without` disables defaulted features; disabled slots are hidden coherently
  (e.g. `without: ["inspector"]` removes the right slot without breaking layout).
- `resolveFeatures(preset, { with, without })` returns `{ features, errors }`;
  `resolveFeaturesOrThrow` fails fast with a readable developer error.
- Incoherent combinations are explicit errors, never a silently broken UI:
  unknown feature ids, disabling a load-bearing capability (`viewport`),
  or enabling a feature no slot of the preset can host.

## Presets

Seven declarative presets compose the same shell: `technical-ribbon`, `ide`,
`studio`, `operator`, `monitoring`, `setup`, `minimal`. `/` renders the manifest layout;
`/presets/<id>` previews each one (demo-only switcher, not part of the shell).
See [`docs/presets.md`](docs/presets.md) for the catalog.

### Controls showcase (demo-only)

`/demo/controls` renders a neutral showcase of the workbench-styled form and data
primitives (linked as "Controls" in the demo switcher, not part of the shell).
New primitives: `Fields` (`FormField`, `TextInput`, `NumberInput`, `SelectInput`,
`Textarea`), `Toggles` (`Checkbox`, `RadioGroup`, `Switch`, `Slider`), `Buttons`
(`WbButton` primary/default/ghost/danger, `FormActions`), plus `Badge` and `DataTable`
(single-select, left/right alignment, ~28px rows). Demo tables: Layers (selection
drives a details readout) and Jobs (progress, status badge, duration).
Dialogs: `Dialog` (+ `ConfirmDialog`/`InfoDialog`) demoed in `ModalsPanel` (form, info/confirm, non-dismissible progress).
States: `EmptyState` (icon + title + message + optional action), `LoadingState`
(CSS-only accent spinner, `role="status"`, plus optional pulsing `Skeleton` rows),
and `ErrorState` (error-tone icon + title + message + retry button) — all in
`src/components/workbench/primitives/States.tsx`, token-styled (`--wb-*` only)
and actionable via plain `onClick` props. Demoed in `StatesPanel`, including an
isolated throw demo proving catch-and-recover without breaking the page.

`ErrorBoundary` (`src/components/workbench/primitives/ErrorBoundary.tsx`)
catches render errors below it and shows the `ErrorState` fallback with a
working retry. It mounts once in `RootLayout` (`src/app/router.tsx`), so every
preset and route is covered. Retry semantics: retry clears the boundary error
and remounts the children (internal nonce key); the optional `onRetry` hook lets
callers clear the trigger that caused the crash. Errors report through `onError`
(default `console.error`); only `error.message` is shown, never stack traces.

## 15. How to create a theme

```css
/* src/styles/themes/graphite.css */
[data-theme="graphite"] {
  --wb-background: #161616;
  --wb-accent: #4cc2ff;
  /* ... override the rest of the --wb-* tokens ... */
}
```

Import it in `src/styles/global.css` and set `data-theme="graphite"` on `<html>`.

## Toasts

Global notification dispatch (`src/workbench/notifications.tsx` + `ToastStack`):

```tsx
const { notify, dismiss, clear } = useToasts();
notify({ title: "Plot finished", message: "Layout1 sent to PDF.", tone: "success" });
notify({
  title: "Review layers",
  tone: "info",
  action: { label: "Show layers", command: "layers.show-all" }, // registered command, no inline logic
});
```

- Tones: `info | success | warning | error`. Defaults auto-dismiss after 5s;
  errors are sticky until dismissed. Override per toast with `durationMs`
  (`null` = sticky).
- Stack caps at 4 (oldest pruned). Hover pauses the auto-dismiss timer.
- Mount point: `ToastsProvider` + `<ToastStack />` live once in
  `WorkbenchShell`, so all presets inherit them. Cards are token-styled
  (`--wb-*` only), bottom-right above the status bar, `role="status"`/`alert`
  with `aria-live="polite"`.
- The Notifications demo widget shows recent toasts first, then static lines
  (it degrades gracefully outside the provider via `useToastsOptional`).

## Pan/zoom viewport

Opt-in interactive mode on the generic `Viewport` (no fork, no preset changes):

```tsx
import { usePanZoom, clampScale, zoomAt, toTransform } from "./usePanZoom";

<Viewport interactive onTransformChange={({ x, y, k }) => console.log(x, y, k)}>
  <MyRenderer />
</Viewport>
```

- `usePanZoom()` owns `{ x, y, k }` plus `zoomIn/zoomOut/zoomBy/panBy/reset`;
  pure math (`clampScale`, cursor-anchored `zoomAt`, `toTransform`) is
  extracted and unit-tested. Scale clamps to 0.2–4.
- `interactive` (default `false`) enables wheel-to-zoom toward the cursor,
  primary-button drag-to-pan (overlay controls excluded), and a zoom
  controls overlay (in/out/reset + `%` readout, `IconButton` styling).
- Keyboard `+`/`-`/`0` when the viewport is focused; none collide with the
  global shortcut dispatcher (`stopPropagation` guards the rest).
- Live demo: `/demo/controls` → "Toasts" + "Pan & zoom viewport" panels.

## Context menus

Declarative right-click menus fed by the same registered commands as the
Ribbon, palette, and shortcuts — a new surface, zero duplicated actions
(`src/workbench/menus.ts` + `ContextMenu` primitive):

```tsx
import type { MenuItem } from "./menus";

const menu: MenuItem[] = [
  { command: "view.zoom-in" }, // label/shortcut pulled from the registry
  { command: "view.zoom-out" },
  { separator: true },
  { label: "Delete", shortcut: "Del", danger: true }, // inline entry
  { label: "Paste", disabled: true },
];
```

- `resolveMenuItems(items, commands)` returns render-ready rows. Unknown
  command ids throw fail-fast (never a silent gap); `clampMenuPosition`
  keeps the overlay inside the viewport. Both are pure and unit-tested.
- `<ContextMenuTrigger menu={...}>` wraps any area; `<MenuOverlay>` is the
  portal itself (cursor-anchored, closes on select/Escape/outside-click/
  scroll/resize; `Up/Down/Home/End` + `Enter`; `role="menu"`/`menuitem`/
  `separator`). Flat list + separators only — no submenus by design.
- `Viewport` takes an opt-in `contextMenu?: MenuItem[]` (default none,
  legacy untouched). The technical-ribbon viewport wires zoom in/out/reset
  - separator + grid toggle, all as registered command ids.
- Live demo: `/demo/controls` → "Context menu" (right-click area +
  last-action readout) and right-click any Layers row.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | Production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `biome ci .` |
| `bun test` | Unit + scaffolding tests |
| `bun run generate:project -- <name> --preset <id> --theme <id>` | Materialize a derived app |
| `bun run generate:feature -- <name>` | Scaffold a feature vertical |
| `bun run generate:widget -- <name> --dock right` | Scaffold a widget |
| `bun run generate:command -- <name>` | Scaffold a command |
| `bun run generate:tool -- <name> --command <id>` | Scaffold a tool |
| `bun run ai:context` / `ai:context:check` | Generate / gate AI context |
| `bun run validate` | Full gate (lint, types, tests, validators, context, build) |
| `bun run validate:architecture` / `validate:workbench` | Targeted validators |
| `bun run self-test:scaffolding` | Temp-project generation contracts |
