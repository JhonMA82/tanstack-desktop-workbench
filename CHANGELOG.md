# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-09-12

### Added

- UI states: `EmptyState`, `LoadingState`/`Skeleton` and `ErrorState`
  primitives, plus an `ErrorBoundary` mounted once at the router root with
  retry recovery and a throw-and-recover showcase demo (110 tests).

## [0.5.0] - 2026-09-12

### Added

- Context menus: menu model with items resolved from registered
  commands (fail-fast on unknown ids), portal overlay with full keyboard
  navigation, opt-in `Viewport` prop wired in the technical-ribbon preset,
  Layers row menu, and a showcase panel (110 tests).

## [0.4.0] - 2026-09-12

### Added

- `light` theme: every `--wb-*` token redefined under
  `[data-theme="light"]`, typed `ThemeId` with validated fallback, and a
  demo-only runtime switcher reusing the persistence path. Proves new
  themes need zero component changes.
- Theme parity test: fails if any theme misses a token defined in
  `tokens.css` (99 tests).

## [0.3.0] - 2026-09-12

### Added

- Global toasts: capped stack with info/success/warning/error tones,
  auto-dismiss (errors sticky), pause on hover and action buttons that
  execute registered commands. Mounted once in the shell; recent toasts
  also surface in the Notifications demo widget.
- Viewport pan/zoom: `usePanZoom` hook (cursor-anchored wheel zoom,
  drag pan, `+`/`-`/`0` keys, 0.2-4 clamp) wired opt-in into the generic
  `Viewport`, with zoom controls overlay and live readout demo.
- Test suites for toast store logic and pan/zoom math (96 tests).

## [0.2.0] - 2026-09-12

### Added

- Controls showcase (`/demo/controls`): generic `Fields` (text, number,
  select, textarea), `Toggles` (checkbox, radio, switch, slider), `WbButton`
  variants, `Badge` and dense `DataTable` primitives, with live Layers and
  Jobs demo panels.
- Modal dialogs: generic portal-based `Dialog` (sizes, dismissible lock,
  focus and scroll management) with `ConfirmDialog`/`InfoDialog` wrappers,
  plus form, info, confirm and progress demos.
- Command palette (`Ctrl/Cmd+K`) over the command registry with filter,
  keyboard navigation and shortcut hints, plus a global shortcut
  dispatcher mounted once in the shell (tool, view and toggle shortcuts
  execute the same registered commands as the buttons).
- Workspace persistence: versioned `tanstack-workbench:v1` localStorage key
  for theme, layout, feature overrides, widget visibility and status
  toggles. Stored state wins over the manifest with safe fallbacks.
- Test suites for shortcut parsing/matching and persistence (82 tests).

## [0.1.0] - 2026-09-12

Initial release of the TanStack Workbench boilerplate: a registry-driven,
desktop-style shell for technical applications, inspired by the OCStudio
reference interface.

### Added

- Workbench core: typed `Command`, `Tool`, `Widget` and `Status` registries
  with React providers (no global state manager, no backend).
- Shell components: fullscreen `WorkbenchShell`, data-driven `Ribbon`
  (tabs, groups, tools), `ToolRail`, generic `Viewport` (grid, overlays,
  crosshair, axis gizmo, view cube), `Inspector`, `CommandBar`, `StatusBar`.
- UI primitives with zero domain knowledge: `ToolButton` (row/stacked),
  `ToolGroup`, `Panel`, `PropertyRow`, `StatusToggle`, `IconButton`,
  `Separator`, `CommandInput`.
- Design tokens (`--wb-*`) with the default `ocstudio` dark theme; no
  hardcoded colors in components.
- `technical-ribbon` preset reproducing the golden reference (Home/Annotate/
  View/Manage ribbon, properties inspector, command bar, blue status bar).
- Declarative preset architecture: `LayoutPreset` slots plus `FeatureId`
  resolution with `with`/`without` overrides and explicit validation errors.
- App manifest (`src/app/workbench.config.ts`): cloning plus editing the
  manifest is the generator (no CLI scaffolding).
- Four additional presets: `ide`, `studio`, `operator`, `minimal`, with
  preview routes (`/presets/$presetId`) and a demo-only preset switcher.
- `docs/presets.md` catalog and a README covering shell, widgets, commands,
  tools, ribbon, layouts, themes and all extension points.
- Test suites for every registry, feature resolution and preset defaults
  (53 tests).

[Unreleased]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.4.0...v0.5.0
[0.5.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.3.0...v0.4.0
[0.4.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.2.0...v0.3.0
[0.3.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.1.0...v0.2.0
[0.2.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/releases/tag/v0.1.0
