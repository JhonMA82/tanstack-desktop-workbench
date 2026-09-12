# AGENTS.md — stable agent contract for the Desktop Workbench boilerplate

Instance state (app, preset, theme, features, registrations) lives in
`docs/ai/generated-context.md`. This file holds only stable rules.

## Rules

- The shell/core (`src/components/workbench/**`, `src/workbench/**`) is stable:
  prefer extension over modification.
- Domain/app code goes in `src/features/**`; never put domain logic in core,
  and core never imports features.
- Never hardcode widgets inside the Inspector; render via `WidgetHost`.
- Never hardcode tools inside the Ribbon; tools resolve a registered command id.
- Never duplicate command logic (one command drives Ribbon, shortcuts, palette,
  menus); commands may be sync or async (`void | Promise<void>`).
- Register every extension (command/widget/tool/status item/feature) through
  the registries or `createWorkbenchRuntime`; duplicates and unknown ids fail fast.
- Style with `--wb-*` theme tokens only; keep parity across themes.
- Respect preset/feature contracts: known ids, no with/without overlap, never
  disable load-bearing features.
- Run the generators before hand-rolling repetitive wiring:
  `generate:feature`, `generate:widget`, `generate:command`, `generate:tool`
  (optionally `generate:status-item`, `generate:preset`).
- Load context selectively; verify before closing.

## Minimal reading path

1. `AGENTS.md` (this file)
2. `docs/ai/generated-context.md`
3. `docs/ai/project-map.yaml`
4. At most 1–2 relevant capsules from `docs/ai/canonical-examples.yaml`
   (routed via `docs/ai/capsule-map.yaml`)
5. The files directly affected

Do not load all presets, all widgets, all primitives, or all of `src/`
except for genuinely cross-cutting changes.

## Verify before closing

```bash
bun run validate
```

(`lint` + `typecheck` + tests + `validate:architecture` +
`validate:workbench` + `ai:context:check` + `build`. A compiling change
with stale AI context or an invalid reference is NOT done. Slower
generation contracts: `bun run self-test:scaffolding`.)
