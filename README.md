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
