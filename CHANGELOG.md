# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JhonMA82/tanstack-desktop-workbench/releases/tag/v0.1.0
