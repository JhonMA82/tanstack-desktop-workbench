# Preset catalog

Seven declarative layout presets compose the same shell. A preset declares
**composition** (which capability ids live in each visual slot plus default
features); it never implements domain logic. Features declare **capabilities**
(what the app can do). The manifest picks one preset and adjusts it with
`with` / `without`.

## Composition sketches

### technical-ribbon

```text
┌──────────────────────────────────────────────────────┐
│ Ribbon                                               │
├─────────────┬────────────────────────┬───────────────┤
│ Tool rail   │                        │ Inspector     │
│             │       Workspace        │               │
├─────────────┴────────────────────────┴───────────────┤
│ Command bar                                          │
├──────────────────────────────────────────────────────┤
│ Status bar                                           │
└──────────────────────────────────────────────────────┘
```

### ide

```text
┌──────────────────────────────────────────────────────┐
│ Toolbar (command center)                             │
├───┬──────────────┬──────────────────────┬────────────┤
│ A │ Sidebar      │ Document tabs        │ Secondary  │
│ C │              │                      │ sidebar    │
│ T │              │      Workspace       │ (optional) │
├───┴──────────────┴──────────────────────┴────────────┤
│ Problems │ Output │ Terminal │ Logs                  │
├──────────────────────────────────────────────────────┤
│ Status bar                                           │
└──────────────────────────────────────────────────────┘
```

### studio

```text
┌──────────────────────────────────────────────────────┐
│ Workspace selector / Toolbar                         │
├──────────────┬──────────────────────────┬─────────────┤
│ Hierarchy    │                          │ Inspector   │
│ Explorer     │     Main workspace       │             │
├──────────────┴──────────────────────────┴─────────────┤
│ Timeline / Nodes / Console                           │
└──────────────────────────────────────────────────────┘
```

### operator

```text
┌──────────────────────────────────────────────────────┐
│ System / machine status                              │
├───────────┬──────────────────────────────┬────────────┤
│ Navigation│                              │ Controls   │
│           │        Main view             │ (persistent)│
├───────────┴──────────────────────────────┴────────────┤
│ Alarms │ Events │ Diagnostics                         │
└──────────────────────────────────────────────────────┘
```

### monitoring

```text
┌──────────────────────────────────────────────────────┐
│ System summary                                       │
├──────────────────────────────────────────────────────┤
│ Active alerts (persistent strip)                     │
├───────────┬──────────────────────────────┬────────────┤
│ Source    │                              │            │
│ nav       │        Tile wall             │  (empty)   │
├───────────┴──────────────────────────────┴────────────┤
│ Event stream                                         │
├──────────────────────────────────────────────────────┤
│ Status line (read-only)                              │
└──────────────────────────────────────────────────────┘
```

Observe-only: no controls, no inspector, no ribbon. The tile wall is
the workspace; the alert strip stays visible above it at all times.

### setup

```text
┌──────────────────────────────────────────────────────┐
│ Toolbar                                              │
├──────────┬───────────────────────────────────────────┤
│ Step     │                                         │
│ rail     │           Step content                  │
│          │                                         │
├──────────┴───────────────────────────────────────────┤
│ Wizard nav (Back / Next)                             │
├──────────────────────────────────────────────────────┤
│ Status bar                                           │
└──────────────────────────────────────────────────────┘
```

Linear and step-driven: the rail shows numbered steps
(done/current/todo), the center renders exactly one step body, and the
footer moves Back/Next (or Finish). No docked panels, no inspector, no
ribbon. Branching and conditional steps are out of scope: the flow is a
fixed ordered list (see "setup: when a linear wizard fits" below).

### minimal

```text
┌──────────────────────────────────────────────────────┐
│ Toolbar                                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│                    Workspace                         │
├──────────────────────────────────────────────────────┤
│ Status bar                                           │
└──────────────────────────────────────────────────────┘
```

## Defaults table

| Preset | Defaults |
| --- | --- |
| technical-ribbon | ribbon, tool-rail, viewport, inspector, command-bar, statusbar |
| ide | toolbar, activity-bar, explorer, viewport, tabs, bottom-panel, console, output, statusbar |
| studio | workspace-selector, toolbar, hierarchy, explorer, viewport, inspector, timeline, bottom-panel |
| operator | system-status, navigation, viewport, controls, alarms, notifications, statusbar |
| monitoring | system-summary, source-nav, tile-wall, viewport, alert-strip, event-stream, statusbar |
| setup | toolbar, step-rail, viewport, wizard-nav, statusbar |
| minimal | toolbar, viewport, statusbar |

## Feature catalog

Ribbon family: `ribbon`, `tool-rail`, `command-bar`, `command-palette`,
`toolbar`. Navigation: `activity-bar`, `navigation`, `workspace-selector`,
`tabs`. Panels: `explorer`, `hierarchy`, `inspector`, `secondary-sidebar`,
`bottom-panel`, `console`, `output`, `timeline`. Operation: `system-status`,
`controls`, `alarms`, `notifications`. Monitoring (observe-only):
`system-summary`, `source-nav`, `tile-wall`, `alert-strip`,
`event-stream`. Wizard (step-driven):
`step-rail`, `wizard-nav`. Core: `viewport` (load-bearing),
`statusbar`.

## with / without semantics

`resolveFeatures(preset, { with, without })` starts from the preset defaults,
removes `without`, then adds `with` (no duplicates). Unknown ids in either
list are reported as errors, never applied silently. `resolveFeaturesOrThrow`
throws a readable multi-line error for incoherent combinations.

## Validation rules

1. Unknown feature ids are rejected (in `with`, `without`, or explicit sets).
2. `viewport` is load-bearing: presets without it are incoherent, so disabling
   it is always an error (e.g. `minimal` + `without: ["viewport"]` fails).
3. Every enabled feature must be hostable: at least one slot of the preset
   must declare a matching capability, otherwise the combination is rejected
   with an explanation instead of rendering a broken layout.
4. Every disabled feature collapses its slot: compositions render `null` for
   missing capabilities, so no empty chrome bars remain.

## monitoring vs operator: when to use which

Both presets watch a system, but only one touches it:

- **monitoring** observes. Pick it for control rooms, dashboards, and
  status walls: tile-wall dominant, persistent alert strip, event stream.
  It ships NO control buttons — acknowledging an alert only hides it
  locally; it issues no commands. The right slot stays empty (no
  inspector) and there is no ribbon.
- **operator** operates. Pick it when a human must act: persistent
  controls (run/stop, overrides) beside the main view, alarms one glance
  away. That is the operator preset's job, never monitoring's.

If the screen needs a single button that changes the system, it is an
operator screen.

## setup: when a linear wizard fits

Pick **setup** for first-run, onboarding, and guided configuration flows:
one task per step, explicit Back/Next, per-step validation gating Next,
a review step summarizing the demo entries, and a terminal Done step with
a restart action. It is spatially distinct from every other preset: a step
rail plus one step body plus a wizard footer, never docked panels.

Rules:

- Linear only: the step list is fixed and ordered. `useWizard` blocks
  `next` while the current step's `canProceed` is false, and `goTo`
  revisits visited steps plus the immediate next one (no skipping
  ahead). Branching or conditional steps are explicitly out of scope;
  a future change adds them with a new ADR, not by bending this core.
- Enter never advances: step bodies hold text inputs, textareas, and
  selects, so navigation is explicit Back/Next (and rail revisits)
  only. Step forms prevent implicit submits.
- The generic machinery (`useWizard`, `WizardShell` in
  `src/components/workbench/wizard/`) holds zero domain knowledge;
  the demo flow (`Connect → Configure → Review → Done`) lives in
  `src/features/setup/` and keeps demo data only.

## Manifest reference

`src/app/workbench.config.ts`:

```ts
{
  appName: "My App",
  layout: "ide", // technical-ribbon | ide | studio | operator | monitoring | setup | minimal
  with: ["notifications"], // extras on top of the preset defaults
  without: ["secondary-sidebar"], // removals that stay coherent
  theme: "ocstudio",
}
```

`/` renders the manifest layout; `/presets/<id>` renders each preset with
defaults. The `Preview` link bar in `src/app/router.tsx` is DEMO-ONLY, not
part of the shell.

## How to add a preset

1. Create `src/features/<name>/<name>Preset.ts` with a `LayoutPreset`
   (`slots` + `defaultFeatures`) and a guarded `register<Name>Preset()`.
2. Create `src/features/<name>/<Name>Workbench.tsx` composing primitives,
   shell pieces (`src/components/workbench/shell/`), the generic `Viewport`,
   and widget components. Gate every region on `hasFeature(features, ...)`.
3. Add the layout id to `WorkbenchLayoutId` and one entry to
   `presetComponents` in `src/app/router.tsx`.
4. Extend `FeatureId` / `KNOWN_FEATURES` / `FEATURE_CAPABILITIES` only when the
   preset needs a capability no slot can host yet.
5. Cover it in `src/workbench/presets.test.ts`: defaults resolve, `without`
   viewport errors, every new id is hostable.

## How to add a feature

1. Add the id to `FeatureId` (`src/workbench/types.ts`), `KNOWN_FEATURES` and
   `FEATURE_CAPABILITIES` (`src/workbench/features.ts`).
2. Declare the capability in at least one preset's `slots`.
3. Gate its UI on `hasFeature`; ensure the layout stays coherent without it.

## How to add a panel

Panels are preset content, not shell: build the body from primitives
(`Panel`, `PanelHeader`, `PropertyRow`) or reuse a widget component from
`src/components/workbench/widgets/`, then render it inside the owning
preset's gated slot. Shared shell chrome (tab strips, sidebars, headers)
belongs in `src/components/workbench/shell/`.
