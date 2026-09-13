# Checklist QA — Factory Stability

> Estabilidad de la "fábrica": el boilerplate materializa aplicaciones derivadas
> correctas, los generators no rompen el repo fuente y el contexto IA no deriva.
> Todo comando corre desde la raíz del repo fuente salvo indicación contraria.
> Para cada escenario: comando → resultado esperado → cómo verificarlo.

Leyenda de resultado: ✅ esperado = el escenario pasa si se observa lo descripto.
Anotá fecha, commit y entorno en la [tabla de registro](#7-tabla-de-registro) al final.

---

## 1. Salud base del repo fuente

| # | Escenario | Comando | Resultado esperado |
| --- | --- | --- | --- |
| 1.1 | Validación agregada completa | `bun run validate` | Exit 0. Corre en orden: `lint` (biome, 145 archivos) → `typecheck` (`tsc --noEmit`) → `bun test` (223 pass / 0 fail) → `validate:architecture` (8/8 grupos ok) → `validate:workbench` (7 presets coherentes) → `ai:context:check` (`AI context is fresh`) → `vite build` (`dist/` generado, ~2 s). Ningún paso esconde errores: si uno falla, el agregado falla. |
| 1.2 | Lint aislado | `bun run lint` | Exit 0, `Checked 145 files`, `No fixes applied`, sin errores ni warnings. |
| 1.3 | Tipos | `bun run typecheck` | Exit 0, sin salida. |
| 1.4 | Tests unitarios | `bun test` | `223 pass, 0 fail` en 22 archivos. |
| 1.5 | Build | `bun run build` | Exit 0, genera `dist/index-*.js` (+ gzip) en ~2 s. |
| 1.6 | Arquitectura | `bun run validate:architecture` | Exit 0 con 7/7 grupos ok: `core/feature isolation`, `--wb-*` tokens, command delegation, duplicate ids, preset resolution, theme parity, scaffolding template tokens. |
| 1.7 | Config del workbench | `bun run validate:workbench` | Exit 0. Reporta `preset "technical-ribbon"`, theme `ocstudio`, 7 presets coherentes. |

---

## 2. `generate:project` — materialización

> Por defecto el destino es `../<name>` (hermano del repo). Los escenarios usan
> `--dest /tmp/qa-<caso>` para no ensuciar el workspace. Cada caso debe dejar
> el destino intacto ante fallos (sin proyectos a medio generar).

| # | Escenario | Comando | Resultado esperado |
| --- | --- | --- | --- |
| 2.1 | Caso técnico feliz | `bun run generate:project -- qa-ribbon --preset technical-ribbon --theme ocstudio --with ribbon --dest /tmp/qa-ribbon` | Exit 0. En `/tmp/qa-ribbon`: `package.json` con nombre `qa-ribbon`, `src/app/workbench.config.ts` con `layout: "technical-ribbon"` + `theme: "ocstudio"` + `with: ["ribbon"]`, `.boilerplate.json` con `template: "tanstack-desktop-workbench"`, `preset`, `theme`, `sourceVersion` y `sourceCommit`, y `docs/ai/generated-context.md` que describe **la app derivada** (Application: Qa Ribbon), no el catálogo del boilerplate. (Nota: `console` no es válido aquí — el preset technical-ribbon no puede alojarlo; el generator lo rechaza con error legible.) |
| 2.2 | Caso mínimo | `bun run generate:project -- qa-min --preset minimal --dest /tmp/qa-min` | Exit 0. Config con `layout: "minimal"`; el proyecto es el más chico válido (viewport + toolbar + statusbar). |
| 2.3 | Caso monitoreo | `bun run generate:project -- qa-mon --preset monitoring --dest /tmp/qa-mon` | Exit 0. Config con `layout: "monitoring"`; incluye capacidades load-bearing `viewport` + `tile-wall`. |
| 2.4 | With/without custom | `bun run generate:project -- qa-custom --preset technical-ribbon --with ribbon --without inspector --dest /tmp/qa-custom` | Exit 0. La config final refleja `with: ["ribbon"]` y `without: ["inspector"]`; las features resueltas contienen `ribbon` y excluyen `inspector`. |
| 2.5 | Dry-run no escribe | `bun run generate:project -- qa-dry --preset technical-ribbon --dest /tmp/qa-dry --dry-run` | Exit 0, reporta lo que haría (incluye el plan de poda: `prune features:`, `prune themes:`, `rewrite:`) y **no crea** `/tmp/qa-dry`. Verificar con `ls /tmp/qa-dry` → no existe. |
| 2.6 | Preset inválido falla antes de escribir | `bun run generate:project -- qa-bad --preset no-existe --dest /tmp/qa-bad` | Exit ≠ 0 con error legible (`unknown preset`). `/tmp/qa-bad` no existe: nada se materializó. |
| 2.7 | With/without en conflicto | `bun run generate:project -- qa-conf --preset technical-ribbon --with ribbon --without ribbon --dest /tmp/qa-conf` | Exit ≠ 0 con error que nombra la feature en conflicto. No se crea el destino. |
| 2.8 | `--force` en directorio ajeno se rehúsa | `mkdir -p /tmp/qa-ajeno && echo hola > /tmp/qa-ajeno/nota.txt && bun run generate:project -- qa-x --dest /tmp/qa-ajeno --force` | Exit ≠ 0 con mensaje de que el destino no tiene marcador válido. `/tmp/qa-ajeno/nota.txt` intacto (contiene `hola`). `--force` **nunca** borra directorios arbitrarios. |
| 2.9 | `--force` sobre derivado previo | `bun run generate:project -- qa-ribbon --preset minimal --dest /tmp/qa-ribbon --force` (tras 2.1) | Exit 0. El destino se reemplaza porque tiene `.boilerplate.json` válido; la config ahora dice `layout: "minimal"`. |
| 2.10 | Flags de aprovisionamiento | `bun run generate:project -- qa-full --preset minimal --dest /tmp/qa-full --install --git` | Exit 0. Además de 2.2: `node_modules/` instalado y `/tmp/qa-full/.git` inicializado. (Requiere red para `bun install`; si no hay red, este escenario se salta y se anota.) |
| 2.11 | Regeneración printnc-control-like (derivado MÍNIMO) | `bun run generate:project -- qa-printnc --preset technical-ribbon --without inspector --theme ocstudio --dest /tmp/qa-printnc` | Exit 0. El derivado contiene SOLO el preset `technical-ribbon` + theme `ocstudio`: `ls /tmp/qa-printnc/src/features/` → solo `technical-ribbon`; `ls /tmp/qa-printnc/src/features/showcase` → no existe; `ls /tmp/qa-printnc/src/features/ide` → no existe; `ls /tmp/qa-printnc/src/styles/themes/` → solo `ocstudio.css` (+ `theme-parity.test.ts`), `light.css` ausente; `grep -c "demo/controls" /tmp/qa-printnc/src/app/router.tsx` → 0; sin barra de preview (`grep -c "PresetSwitcher\|ThemeSwitcher\|previewPresets\|PresetPreviewPage\|presetPreviewRoute\|presets/\$presetId\|workbenchThemes" /tmp/qa-printnc/src/app/router.tsx` → 0) con `RootLayout` renderizando `<Outlet />` directo; `src/app/workbench.config.ts` con `WorkbenchLayoutId = "technical-ribbon"` y `workbenchThemes = ["ocstudio"]`. Dentro del derivado (con `node_modules` por symlink al fuente): `tsc --noEmit` exit 0, `bun test` 0 fail, `bun run ai:context:check` fresh. |
| 2.12 | Derivado LIMPIO (ejemplo mínimo end-to-end) | `bun run generate:project -- qa-clean --preset technical-ribbon --dest /tmp/qa-clean` (tras 2.11 o standalone) | Exit 0. Sin contenido demo, con UN ejemplo funcional por extension point: `ls /tmp/qa-clean/src/features/technical-ribbon/` → sin `DemoGeometry.tsx` ni subdir `technicalRibbonTools/`; `grep -rn "DemoGeometry\|DemoWidgets" /tmp/qa-clean/src/features/technical-ribbon/` → 0 matches; `technicalRibbonRibbon.ts` → solo tab `home` con grupo `draw` (`select`, `line`, `circle`), sin `annotate`/`view`/`manage`; `technicalRibbonCommands.ts` → solo `tool.select`, `draw.line`, `draw.circle`, `grid.toggle` (sin `modify.*`, `view.*`, `app.*`, `annotate.*`, `layer.*`); `technicalRibbonWidgets.ts` → solo `properties` visible; `technicalRibbonStatus.ts` → solo `grid` (sin `osnap`/`ortho`); `technicalRibbonLayout.tsx` → `Viewport` vacío sin `<DemoGeometry />` y menú con solo `grid.toggle`. Coherencia: dentro del derivado `tsc --noEmit` exit 0, `bun test` 0 fail (incluye `technicalRibbonCommands.test.ts` recortado), `bun run ai:context:check` fresh y `docs/ai/generated-context.md` reporta `widgets: properties`, `commands: 4 registered`, `tools: circle, line, select`. |
| 2.13 | Multi-preset (`--with-presets`) | `bun run generate:project -- qa-multi --preset technical-ribbon --with-presets ide --dest /tmp/qa-multi` | Exit 0. Se conservan `technical-ribbon` + `ide`: `ls /tmp/qa-multi/src/features/` → `ide` y `technical-ribbon` existen, el resto no (ni `showcase`); `src/app/router.tsx` mapea ambos (`"technical-ribbon"` y `"ide"` en `presetComponents`) sin barra de preview; `src/app/workbench.config.ts` con `WorkbenchLayoutId = "technical-ribbon" \| "ide"` y `layout: 'technical-ribbon'`; el cambio de preset es editar `layout` + `bun run ai:context` (verificado: `docs/ai/generated-context.md` lista `presets: ide, technical-ribbon`). La limpieza demo aplica igual al `technical-ribbon` conservado (ver 2.12). `--with-presets` inválido (`--with-presets nope`) → exit ≠ 0 con `Unknown preset` y sin destino. Dentro del derivado: `tsc --noEmit` exit 0, `bun test` 0 fail, `ai:context:check` fresh. |

Verificación común de un derivado (vale para 2.1–2.4, 2.9–2.13):

- `cat /tmp/qa-<caso>/.boilerplate.json` → `schemaVersion: 1`, `template` correcto.
- Derivado MÍNIMO: solo los presets y theme elegidos (`--preset` + `--with-presets`; uno sin el flag). `ls /tmp/qa-<caso>/src/features/` → solo los dirs de los presets elegidos (+ dirs custom si los hubiera, nunca `showcase` ni otros presets); `ls /tmp/qa-<caso>/src/styles/themes/` → solo `<theme>.css`; `grep -rn "showcase\|ControlsShowcase\|demo/controls" /tmp/qa-<caso>/src/app/router.tsx` → sin matches; `presetComponents` nombra solo los presets elegidos.
- Sin barra de preview: `grep -rn "PresetSwitcher\|ThemeSwitcher\|previewPresets\|PresetPreviewPage\|presetPreviewRoute\|presets/\$presetId\|workbenchThemes" /tmp/qa-<caso>/src/app/router.tsx` → sin matches; `grep -n "<Outlet />" /tmp/qa-<caso>/src/app/router.tsx` → `RootLayout` lo renderiza directo bajo `ErrorBoundary` (con el init de theme intacto); la ruta índice (`path: "/"`) renderiza el único preset.
- Shortcuts con efecto (derivado technical-ribbon o fuente): `bun test src/features/technical-ribbon/technicalRibbonCommands.test.ts` → `execute("draw.line")` deja `line` como tool seleccionada; en navegador, con el foco en el body, L/C/M/Z/P/V registran su tool y G/F8/F3 conmutan `GRID`/`ORTHO`/`OSNAP` (el grid del viewport y los pills del status bar se actualizan al re-render, p. ej. moviendo el puntero sobre el viewport).
- Tests del catálogo adaptados (nunca borrados sin reemplazo): `src/workbench/presets.test.ts`, `src/app/workbench.config.test.ts`, `src/styles/themes/theme-parity.test.ts` y `scripts/ai-context.test.ts` afirman el catálogo podado; el derivado pasa `bun test` y `tsc --noEmit`.
- Archivos source-only ausentes: `scripts/generate-project.ts`, `scripts/scaffolding.test.ts`, `scripts/self-test-scaffolding.ts`, `docs/qa-factory-stability-checklist.md` y `CHANGELOG.md` **no** existen en el derivado; los 6 generators de extensión (`generate-feature/widget/command/tool/status-item/preset`) **sí** existen, junto con `scripts/_lib/`, `generate-ai-context.ts` (+ test), `validate-architecture/workbench.ts` (+ script `validate` agregado), `docs/scaffolding.md`, `docs/presets.md`, `docs/ai/*` y `AGENTS.md`.
- `package.json` del derivado sin los scripts `generate:project` ni `self-test:scaffolding` (sus archivos ya no existen ahí).
- `README.md` del derivado describe **la app** (nombre, preset+theme+features resueltas, comandos útiles, punteros a `docs/scaffolding.md` y `docs/ai/generated-context.md`); no menciona workflows de fábrica (`generate:project`, `self-test`).
- `cd /tmp/qa-<caso> && bun run ai:context:check` → `AI context is fresh`.
- Derivado LIMPIO (2.12–2.13, solo si conserva `technical-ribbon`): sin `DemoGeometry.tsx` ni `technicalRibbonTools/`; ribbon con solo `Home/Draw` (`select`, `line`, `circle`); commands con solo `tool.select`, `draw.line`, `draw.circle`, `grid.toggle`; widgets con solo `properties`; status con solo `grid`; viewport vacío. Multi-preset (2.13): `WorkbenchLayoutId` es la unión de los conservados y el cambio de preset es editar `layout` en la config + `bun run ai:context`.
- Limpieza: `rm -rf /tmp/qa-<caso>` al terminar (salvo 2.11).
- 2.11 (opcional, pesado): dentro del derivado `bun run generate:feature -- sondeo` → exit 0 y crea `src/features/sondeo/`; demuestra que los generators del derivado funcionan.

---

## 3. Generators de extensión (sobre el repo fuente)

> Usar nombres `qa-*` y borrar lo generado al terminar cada escenario.
> Sin `--force`, un generator nunca sobrescribe: el conflicto es error.

| # | Escenario | Comando | Resultado esperado |
| --- | --- | --- | --- |
| 3.1 | Feature vertical | `bun run generate:feature -- qa-control` | Exit 0. Crea `src/features/qa-control/` con `index`, `feature`, `commands` y `tools`; registra sus capabilities vía el registry extensible (sin editar `src/workbench/features.ts`). Al final refresca `docs/ai/generated-context.md` (el digest cambia). |
| 3.2 | Feature con capabilities | `bun run generate:feature -- qa-tel --capability console --capability bottom-panel --dry-run` | Exit 0, lista los 4 archivos que crearía, no escribe nada. |
| 3.3 | Widget con dock | `bun run generate:widget -- qa-telemetry --dock right --feature qa-control` | Exit 0. Crea componente + registro explícito; no toca `WorkbenchShell`; usa tokens `--wb-*`. |
| 3.4 | Dock inválido | `bun run generate:widget -- qa-bad --dock nowhere` | Exit ≠ 0 con error legible que lista `left\|right\|bottom\|floating\|hidden`. No se crea ningún archivo. |
| 3.5 | Command sync | `bun run generate:command -- qa-connect --feature qa-control --label "Connect" --shortcut Ctrl+Q` | Exit 0. Módulo de registro con metadata (label, shortcut, feature owner); integrable vía Command Registry sin tocar el Ribbon. |
| 3.6 | Command async | `bun run generate:command -- qa-export --feature qa-control --async` | Exit 0. Handler `async`; `execute()` lo dispara sin romper el contrato sync ni el `history()`. |
| 3.7 | Tool sobre command existente | `bun run generate:tool -- qa-home --command qa-connect --group machine --feature qa-control` | Exit 0. Tool declarativa que resuelve el command; sin duplicar su lógica. Si el command no existe en `src/`, avisa (no falla en silencio). |
| 3.8 | Status item | `bun run generate:status-item -- qa-link --kind readout --feature qa-control` | Exit 0. Módulo de status item `readout` registrado. (`--kind toggle` genera variante conmutadora.) |
| 3.9 | Preset coherente | `bun run generate:preset -- qa-layout --dry-run` | Exit 0. Propone un `LayoutPreset` coherente (con `viewport` load-bearing). El alta en `presetComponents` queda manual y explícita (así está diseñado). |
| 3.10 | Conflicto sin `--force` | Repetir `bun run generate:feature -- qa-control` (tras 3.1) | Exit ≠ 0: error de archivos existentes, no sobrescribe. Con `--force` sí reemplaza. |
| 3.11 | Ayuda de cada generator | `bun run generate:<feature\|widget\|command\|tool\|status-item\|preset> -- --help` | Exit 0 con `Usage:` y ejemplos. |

Limpieza obligatoria tras la sección 3: `rm -rf src/features/qa-control src/features/qa-tel` y cualquier `qa-*` generado, luego `bun run ai:context` para que el digest vuelva al estado base y `bun run ai:context:check` pase.

---

## 4. AI context

| # | Escenario | Comando | Resultado esperado |
| --- | --- | --- | --- |
| 4.1 | Regenerar | `bun run ai:context` | Exit 0. Reescribe `docs/ai/generated-context.md` con cabecera `Generated file — do not edit manually` y línea `- digest: <16 hex>`. El contenido refleja el repo real (7 presets, 2 themes, 30 features core, conteos de widgets/commands/tools). |
| 4.2 | Check fresh | `bun run ai:context:check` (justo tras 4.1) | Exit 0: `AI context is fresh (digest <hex>)`. |
| 4.3 | Detección de drift | Tocar `src/app/workbench.config.ts` (ej. cambiar `appName`), luego `bun run ai:context:check` | Exit 1 con `docs/ai/generated-context.md is stale. Run bun run ai:context and commit the result.` Revertir el cambio y correr `bun run ai:context` para dejar todo fresh. |
| 4.4 | No editar a mano | — (inspección) | `docs/ai/generated-context.md` nunca se edita manualmente; formateadores externos no deben tocarlo (se compara por bytes). |

---

## 5. Núcleo (contratos Fase A — regresión)

| # | Escenario | Cómo verificar | Resultado esperado |
| --- | --- | --- | --- |
| 5.1 | Preset canónico único | `grep -rn registerLayout src/features/ \| head` | Sin matches: nadie registra la intención dos veces. `globalLayouts` es adapter sobre `globalPresets`. |
| 5.2 | Features extensibles sin tocar el core | `bun test src/workbench/features.test.ts` | Pass: registro fuera del core, duplicados y load-bearing validados. |
| 5.3 | Runtime aislado | `bun test src/workbench/runtime.test.ts` | Pass: dos runtimes no se contaminan; `globalRuntime` equivale a los globales. |
| 5.4 | Commands async | `bun test src/workbench/registry/commands.test.ts` | Pass: handlers async ejecutan, el historial se registra y un rechazo async no rompe `execute()`. |

---

## 6. Self-test automatizado (atajo)

| # | Escenario | Comando | Resultado esperado |
|---|---|---|---|
| 6.1 | Self-test del scaffolder | `bun run self-test:scaffolding` | Exit 0. Genera 9 derivados reales (uno por preset + custom with/without + multi-preset technical-ribbon+ide), verifica en cada uno la poda (sin `showcase`, sin presets no elegidos, sin theme no elegido, router sin demo), en los que conservan `technical-ribbon` la limpieza demo (sin `DemoGeometry`, ribbon `Home/Draw` con 3 tools, 4 commands, widget `properties`, status `grid`) y les corre typecheck (vía symlink a `node_modules`, sin red, con tiempos por caso) más un loop `generate:feature` → `ai:context` dentro del derivado; limpia las fixtures. Cubre 2.1–2.4 y 2.11–2.13 de forma automática. |

> Si el self-test pasa pero un escenario manual de la sección 2 falla, el bug está
> en el escenario manual (flags/entorno): reportarlo con el comando exacto.

---

## 7. Tabla de registro

| Fecha | Commit | Entorno (bun/OS) | Secciones corridas | Fallos (n° escenario + síntoma) | Firma |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
| | | | | | |
| | | | | | |

Criterio de aceptación global: secciones 1–5 en verde (la 6 es el atajo
automatizado de la 2), `git status` limpio salvo los `qa-*` ya borrados, y
`bun run ai:context:check` fresh al cerrar.
