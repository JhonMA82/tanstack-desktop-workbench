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

`registerLayout({ id, name, railTools?, rightWidgets?, bottomWidgets? })`.
`technical-ribbon` is the first preset; `ide / studio / operator / minimal` arrive in Phase B without shell edits.
`globalLayouts.setActive(id)` switches; unknown ids throw.

## 10. Themes

Tokens in `src/styles/tokens.css`, values per theme in `src/styles/themes/*.css`
(`[data-theme="ocstudio"]` is default, set on `<html>`). New themes override tokens only.

## 11. How to add a widget

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

```tsx
globalCommands.registerCommand("view.reset", resetCamera, { label: "Reset view", shortcut: "R" });
```

## 14. How to create a layout

```tsx
globalLayouts.registerLayout({
  id: "monitoring",
  name: "Monitoring",
  railTools: ["select", "pan"],
  rightWidgets: ["jobs", "notifications"],
  bottomWidgets: ["console"],
});
```

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
      `hierarchy`, `timeline`, `workspace-selector`)).
    Full catalog, composition sketches, and how-to guides live in
    [`docs/presets.md`](docs/presets.md).

A preset enables features by default, but layout and features are not the
same concept: the same feature (e.g. `inspector`) can be hosted by different
slots of different presets.

## App manifest

`src/app/workbench.config.ts` is the declarative generation metadata (cloning

- editing this file IS the generator — there is no CLI):

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

Five declarative presets compose the same shell: `technical-ribbon`, `ide`,
`studio`, `operator`, `minimal`. `/` renders the manifest layout;
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

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | Production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `biome ci .` |
| `bun test` | Unit tests (registries) |
