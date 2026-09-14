<!-- Generated file — do not edit manually. Regenerate with `bun run ai:context`. -->
# Generated context — Technical Workbench

- package: tanstack-workbench@0.9.0 (boilerplate source)
- stack: bun@1.4.0, @biomejs/biome@2.5.13, @juicesharp/rpiv-ask-user-question@^2.10.1, @tailwindcss/vite@4.3.3, @tanstack/react-router@1.170.35, @types/react@19.3.0, @types/react-dom@19.3.0, @vitejs/plugin-react@6.1.1, bun-types@1.4.2, lucide-react@1.45.0, react@19.3.0, react-dom@19.3.0, tailwindcss@4.3.3, typescript@5.9.3, vite@8.3.0
- preset: technical-ribbon (layout technical-ribbon)
- theme: ocstudio (files: light, ocstudio)
- with: []
- without: []
- resolved features: command-bar, inspector, ribbon, statusbar, tool-rail, viewport (33 known core)
- custom features: none
- widgets: console, history, jobs, layers, measurements, navigator, notifications, objects, properties
- commands: 41 registered (annotate.aligned, annotate.angular, annotate.dim, annotate.leader, annotate.linear, annotate.mleader, annotate.mtext, annotate.radius, annotate.style, annotate.text, app.cui, app.load, …)
- tools: aligned, angular, arc, circle, copy, cui, dim, extents, freeze, layers, leader, line, linear, loadApp, lock, mirror, mleader, move, mtext, palettes, pan, poly, radius, rect, rotate, runScript, select, shaded, style, text, trim, viewports, wire2d, xray, zoom
- status items: grid, ortho, osnap
- presets: forms, ide, minimal, monitoring, operator, records, settings, setup, studio, technical-ribbon
- scripts: ai:context, ai:context:check, build, dev, generate:command, generate:feature, generate:preset, generate:project, generate:status-item, generate:tool, generate:widget, lint, self-test:scaffolding, test, typecheck, validate, validate:architecture, validate:workbench
- templates: inline templates in scripts/generate-*.ts (no templates dir)
- digest: 4e878770d5a3fd39

## Presets (defaults)

- forms (Forms): form, inspector, navigation, statusbar, toolbar
- ide (IDE): activity-bar, bottom-panel, console, explorer, output, statusbar, tabs, toolbar, viewport
- minimal (Minimal): statusbar, toolbar, viewport
- monitoring (Monitoring): alert-strip, event-stream, source-nav, statusbar, system-summary, tile-wall, viewport
- operator (Operator): alarms, controls, navigation, notifications, statusbar, system-status, viewport
- records (Records): data-table, detail, navigation, statusbar, toolbar
- settings (Settings): form, statusbar, toolbar
- setup (Setup): statusbar, step-rail, toolbar, viewport, wizard-nav
- studio (Studio): bottom-panel, explorer, hierarchy, inspector, timeline, toolbar, viewport, workspace-selector
- technical-ribbon (Technical Ribbon): command-bar, inspector, ribbon, statusbar, tool-rail, viewport

## Preset patterns (structure)

### `forms` · dir `src/features/forms`

- composition: top=[toolbar] left=[navigation] center=[form] right=[inspector] bottom=[status-bar] | features: toolbar, navigation, form, inspector, statusbar
- shell: `FormsWorkbench.tsx`
- edit: slots→`formsPreset.ts`; shell→`FormsWorkbench.tsx`

### `ide` · dir `src/features/ide`

- composition: top=[toolbar, command-palette] left=[activity-bar, explorer] center=[viewport, tabs] right=[secondary-sidebar, inspector] bottom=[bottom-panel, console, output, notifications, status-bar] | features: toolbar, activity-bar, explorer, viewport, tabs, bottom-panel, console, output, statusbar
- shell: `IdeWorkbench.tsx`
- edit: slots→`idePreset.ts`; shell→`IdeWorkbench.tsx`

### `minimal` · dir `src/features/minimal`

- composition: top=[toolbar] center=[viewport] bottom=[status-bar] | features: toolbar, viewport, statusbar
- shell: `MinimalWorkbench.tsx`
- edit: slots→`minimalPreset.ts`; shell→`MinimalWorkbench.tsx`

### `monitoring` · dir `src/features/monitoring`

- composition: top=[system-summary, alert-strip] left=[source-nav] center=[tile-wall, viewport] bottom=[event-stream, status-bar] | features: system-summary, source-nav, tile-wall, viewport, alert-strip, event-stream, statusbar
- shell: `MonitoringWorkbench.tsx`
- edit: slots→`monitoringPreset.ts`; shell→`MonitoringWorkbench.tsx`

### `operator` · dir `src/features/operator`

- composition: top=[system-status] left=[navigation] center=[viewport] right=[controls] bottom=[alarms, notifications, output, status-bar] | features: system-status, navigation, viewport, controls, alarms, notifications, statusbar
- shell: `OperatorWorkbench.tsx`
- edit: slots→`operatorPreset.ts`; shell→`OperatorWorkbench.tsx`

### `records` · dir `src/features/records`

- composition: top=[toolbar] left=[navigation] center=[data-table] right=[detail] bottom=[status-bar] | features: toolbar, navigation, data-table, detail, statusbar
- shell: `RecordsWorkbench.tsx`
- edit: slots→`recordsPreset.ts`; shell→`RecordsWorkbench.tsx`

### `settings` · dir `src/features/settings`

- composition: top=[toolbar] center=[form] bottom=[status-bar] | features: toolbar, form, statusbar
- shell: `SettingsWorkbench.tsx`
- edit: slots→`settingsPreset.ts`; shell→`SettingsWorkbench.tsx`

### `setup` · dir `src/features/setup`

- composition: top=[toolbar] left=[step-rail] center=[viewport] bottom=[wizard-nav, status-bar] | features: toolbar, step-rail, viewport, wizard-nav, statusbar
- shell: `SetupWorkbench.tsx`
- edit: slots→`setupPreset.ts`; shell→`SetupWorkbench.tsx`

### `studio` · dir `src/features/studio`

- composition: top=[workspace-selector, toolbar] left=[hierarchy, explorer] center=[viewport] right=[inspector] bottom=[timeline, bottom-panel, console, status-bar] | features: workspace-selector, toolbar, hierarchy, explorer, viewport, inspector, timeline, bottom-panel
- shell: `StudioWorkbench.tsx`
- edit: slots→`studioPreset.ts`; shell→`StudioWorkbench.tsx`

### `technical-ribbon` · dir `src/features/technical-ribbon`

- composition: top=[ribbon] left=[tool-rail] center=[viewport] right=[inspector] bottom=[command-bar, status-bar] | features: ribbon, tool-rail, viewport, inspector, command-bar, statusbar
- ribbon (`technicalRibbonRibbon.ts`): Home[draw(line,circle,rect,arc,poly) modify(move,copy,rotate,mirror,trim) layers(layers,freeze,lock) annotation(text,dim,leader)] | Annotate[text(mtext,text,style) dimensions(linear,aligned,angular,radius) leaders(mleader)] | View[navigate(zoom,pan,extents) visual(wire2d,shaded,xray) windows(viewports)] | Manage[custom(cui,palettes) apps(loadApp,runScript)]
- rail (`technicalRibbonTools.ts`): select, line, move, layers, rect, circle, dim, text
- tools: 35 defs (`technicalRibbonTools.ts` + 4 parts in `technicalRibbonTools/` (annotateTools, homeTools, manageTools, viewTools))
- widgets (`technicalRibbonWidgets.ts`): properties(Properties,right,visible) layers(Layers,left,hidden) objects(Object Tree,left,hidden) console(Console,bottom,hidden) history(Command History,bottom,hidden) navigator(Navigator,right,hidden) measurements(Measurements,right,hidden) jobs(Jobs,bottom,hidden) notifications(Notifications,right,hidden)
- status (`technicalRibbonStatus.ts`): grid, ortho, osnap
- commands (`technicalRibbonCommands.ts`): draw.line, draw.circle, draw.rect, draw.arc, draw.poly, modify.move, modify.copy, modify.rotate, modify.mirror, modify.trim, … (41 total)
- shell: `TechnicalRibbonPage.tsx`, `technicalRibbonLayout.tsx`
- edit: tab→`technicalRibbonRibbon.ts`; tool→`technicalRibbonTools/<tab>Tools.ts` + command→`technicalRibbonCommands.ts`; widget→`technicalRibbonWidgets.ts`; status→`technicalRibbonStatus.ts`; slots→`technicalRibbonPreset.ts`; shell→`TechnicalRibbonPage.tsx`, `technicalRibbonLayout.tsx`

## Controls library (primitives · shared core, never pruned)

- Shared core: `src/components/workbench/primitives/` — available in every preset and kept in derived projects. The `/demo/controls` gallery (`src/features/showcase/`) is pruned from derived apps; this library is not.
- Recipes: `docs/ai/canonical-examples.yaml` (`controls-form`, `controls-table`, `controls-dialog`). Toast UI lives in `src/components/workbench/shell/ToastStack.tsx` + `src/workbench/notifications` (not primitives).

- **forms** · `Checkbox` (`Toggles.tsx`): Dense checkbox with an associated label. Controlled.
- **forms** · `CommandInput` (`CommandInput.tsx`): Single-line command input. Behavior (history, shortcuts) lives in the owner.
- **forms** · `FormActions` (`Buttons.tsx`): Right-aligned action row for forms and dialog footers.
- **forms** · `FormField` (`Fields.tsx`): Label + hint + error wrapper. Associates the label via htmlFor.
- **forms** · `IconButton` (`IconButton.tsx`): Shared forms primitive.
- **forms** · `NumberInput` (`Fields.tsx`): Dense numeric input. Controlled; shares the TextInput visuals.
- **forms** · `RadioGroup` (`Toggles.tsx`): Dense radio group. Controlled single-select via fieldset + legend.
- **forms** · `SelectInput` (`Fields.tsx`): Dense styled native select. Controlled.
- **forms** · `Slider` (`Toggles.tsx`): Dense slider with a mono value readout. Controlled.
- **forms** · `Switch` (`Toggles.tsx`): Dense toggle switch. Button with role=switch for keyboard support.
- **forms** · `Textarea` (`Fields.tsx`): Dense multi-line textarea. Controlled.
- **forms** · `TextInput` (`Fields.tsx`): Dense single-line text input. Controlled; layout via FormField.
- **forms** · `ToolbarSeparator` (`ToolButton.tsx`): Shared forms primitive.
- **forms** · `ToolButton` (`ToolButton.tsx`): Generic tool button. Knows nothing about CAD.
- **forms** · `ToolGroup` (`ToolButton.tsx`): Shared forms primitive.
- **forms** · `WbButton` (`Buttons.tsx`): Generic workbench button. Complements IconButton/ToolButton.
- **tables** · `DataTable` (`DataTable.tsx`): Dense data grid (~28px rows) with single-select active row state.
- **overlays** · `ConfirmDialog` (`Dialog.tsx`): Confirm/cancel dialog with default or danger tone.
- **overlays** · `ContextMenuTrigger` (`ContextMenuTrigger.tsx`): Wrap any area to open a declarative menu on right-click.
- **overlays** · `Dialog` (`Dialog.tsx`): Generic modal dialog. Overlay + centered panel rendered via portal.
- **overlays** · `InfoDialog` (`Dialog.tsx`): Single-action informative dialog.
- **overlays** · `MenuOverlay` (`ContextMenu.tsx`): Cursor-anchored menu overlay. Portal + clamped position + Esc/outside/
- **feedback** · `Badge` (`Badge.tsx`): Compact status pill. Tint comes from status tokens, never hardcoded hex.
- **feedback** · `EmptyState` (`States.tsx`): Compact placeholder for lists and panels with nothing to show.
- **feedback** · `ErrorBoundary` (`ErrorBoundary.tsx`): Catches render errors below it and shows the ErrorState fallback.
- **feedback** · `ErrorState` (`States.tsx`): Compact failure notice with a retry action. Shows the message only,
- **feedback** · `LoadingState` (`States.tsx`): CSS-only accent spinner plus optional skeleton rows.
- **feedback** · `Skeleton` (`States.tsx`): Pulsing placeholder blocks. Pairs with LoadingState or stands alone.
- **feedback** · `StatusToggle` (`StatusToggle.tsx`): Small on/off pill used by the status bar.
- **layout** · `Panel` (`Panel.tsx`): Shared layout primitive.
- **layout** · `PanelHeader` (`Panel.tsx`): Shared layout primitive.
- **layout** · `PanelSection` (`Panel.tsx`): Shared layout primitive.
- **layout** · `PropertyRow` (`PropertyRow.tsx`): Label/value row for property grids.
- **layout** · `Separator` (`Separator.tsx`): Shared layout primitive.

## Where to extend

- Preferred: `src/features/**` (domain code), `src/styles/themes/**`, workbench.config, registries/runtime extension APIs.
- Protected core: `src/components/workbench/**`, `src/workbench/**` (extend before modifying).
- Scaffold first: bun run generate:feature|generate:widget|generate:command|generate:tool.
- Validate: bun run lint, bun x tsc --noEmit, bun test, bun run ai:context:check.
