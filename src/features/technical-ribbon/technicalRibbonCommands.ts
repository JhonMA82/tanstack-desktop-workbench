import { type CommandRegistry, globalCommands } from "../../workbench/commands";
import { globalStatus, type StatusRegistry } from "../../workbench/status";
import { globalTools, type ToolRegistry } from "../../workbench/tools";

/**
 * Selection state owned by the technical-ribbon preset (NOT the core): which
 * tool the last executed tool-command selected. The core ToolRegistry is a
 * definition catalog with no active-tool state, and the core must stay
 * decoupled from presets, so the preset module tracks selection per tool
 * registry instance. Keyed by registry so tests on fresh registries never
 * pollute (or observe) the shared globals. A future shell sync can promote
 * this into the core ToolProvider highlight via
 * `subscribeSelectedTechnicalRibbonToolId`.
 */
const selectedToolByRegistry = new WeakMap<ToolRegistry, string | null>();
const listenersByRegistry = new WeakMap<ToolRegistry, Set<() => void>>();

/** Id of the tool last selected through `tools`, or null when none was. */
export function getSelectedTechnicalRibbonToolId(
  tools: ToolRegistry = globalTools,
): string | null {
  return selectedToolByRegistry.get(tools) ?? null;
}

/**
 * Subscribe to selection changes for `tools`. Returns an unsubscribe
 * function. No notification fires when the selection is set to its current
 * value, so handlers stay idempotent and re-entrant.
 */
export function subscribeSelectedTechnicalRibbonToolId(
  tools: ToolRegistry,
  listener: () => void,
): () => void {
  let listeners = listenersByRegistry.get(tools);
  if (!listeners) {
    listeners = new Set();
    listenersByRegistry.set(tools, listeners);
  }
  listeners.add(listener);
  return () => {
    listenersByRegistry.get(tools)?.delete(listener);
  };
}

function setSelectedTechnicalRibbonToolId(
  tools: ToolRegistry,
  toolId: string,
): void {
  if (selectedToolByRegistry.get(tools) === toolId) {
    return;
  }
  selectedToolByRegistry.set(tools, toolId);
  listenersByRegistry.get(tools)?.forEach((notify) => {
    notify();
  });
}

/**
 * Anti-loop guard for the ToolProvider bridge: sync only when there is a
 * selection and it differs from the core active tool. Pure so it stays
 * unit-testable without a DOM.
 */
export function shouldSyncTechnicalRibbonTool(
  selectedToolId: string | null,
  activeToolId: string | null,
): boolean {
  return selectedToolId !== null && selectedToolId !== activeToolId;
}

/**
 * External-store sync for the preset selection, ready for
 * `useSyncExternalStore`. The bridge component subscribes through this and
 * calls the core `selectTool` only when `shouldSyncTechnicalRibbonTool`
 * passes, so the mount is a no-op when the selection coincides or is null.
 */
export function getTechnicalRibbonToolSync(tools: ToolRegistry = globalTools): {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => string | null;
} {
  return {
    subscribe: (listener: () => void) =>
      subscribeSelectedTechnicalRibbonToolId(tools, listener),
    getSnapshot: () => getSelectedTechnicalRibbonToolId(tools),
  };
}

/**
 * App-level actions (load application, run script, UI customization) never
 * hijack the active tool, even when a tool carries them: selecting "Load App"
 * as the working tool would be wrong. They stay documented no-ops.
 */
const APP_COMMAND_PREFIX = "app.";

/**
 * Resolve a command to its tool through the ToolRegistry and record the
 * selection. Resolution is lazy (at execute time) because preset wiring
 * registers commands before tools. Commands with no tool (view.reset,
 * view.zoom-in, view.zoom-out, ...) are actions, not tools: documented no-op.
 */
function selectToolForCommand(commandId: string, tools: ToolRegistry): void {
  if (commandId.startsWith(APP_COMMAND_PREFIX)) {
    return;
  }
  const tool = tools.list().find((entry) => entry.command === commandId);
  if (!tool) {
    return;
  }
  setSelectedTechnicalRibbonToolId(tools, tool.id);
}

function noop(): void {
  /* action without a tool: no domain logic in the boilerplate */
}

export function registerTechnicalRibbonCommands(
  commands: CommandRegistry = globalCommands,
  status: StatusRegistry = globalStatus,
  tools: ToolRegistry = globalTools,
): void {
  const simple: Array<[string, string, string?]> = [
    ["draw.line", "Line", "L"],
    ["draw.circle", "Circle", "C"],
    ["draw.rect", "Rectangle", undefined],
    ["draw.arc", "Arc", undefined],
    ["draw.poly", "Polygon", undefined],
    ["modify.move", "Move", "M"],
    ["modify.copy", "Copy", undefined],
    ["modify.rotate", "Rotate", undefined],
    ["modify.mirror", "Mirror", undefined],
    ["modify.trim", "Trim", undefined],
    ["layer.props", "Layer Properties", undefined],
    ["layer.freeze", "Freeze Layer", undefined],
    ["layer.lock", "Lock Layer", undefined],
    ["annotate.text", "Text", undefined],
    ["annotate.dim", "Dimension", undefined],
    ["annotate.leader", "Leader", undefined],
    ["annotate.mtext", "Multiline Text", undefined],
    ["annotate.style", "Text Style", undefined],
    ["annotate.linear", "Linear Dimension", undefined],
    ["annotate.aligned", "Aligned Dimension", undefined],
    ["annotate.angular", "Angular Dimension", undefined],
    ["annotate.radius", "Radius Dimension", undefined],
    ["annotate.mleader", "Multileader", undefined],
    ["view.zoom", "Zoom", "Z"],
    ["view.zoom-in", "Zoom In", undefined],
    ["view.zoom-out", "Zoom Out", undefined],
    ["view.reset", "Reset View", undefined],
    ["view.pan", "Pan", "P"],
    ["view.extents", "Zoom Extents", undefined],
    ["view.wire2d", "2D Wireframe", undefined],
    ["view.shaded", "Shaded", undefined],
    ["view.xray", "X-Ray", undefined],
    ["view.viewports", "Viewports", undefined],
    ["app.cui", "Customize UI", undefined],
    ["app.palettes", "Tool Palettes", undefined],
    ["app.load", "Load Application", undefined],
    ["app.script", "Run Script", undefined],
    ["tool.select", "Select", "V"],
  ];
  for (const [id, label, shortcut] of simple) {
    // Idempotent: registerCommand throws on duplicates, and preset wiring
    // runs at import time (hot reloads re-import). First registration wins.
    if (commands.has(id)) {
      continue;
    }
    if (id.startsWith(APP_COMMAND_PREFIX)) {
      commands.registerCommand(id, noop, { label, shortcut });
    } else {
      commands.registerCommand(id, () => selectToolForCommand(id, tools), {
        label,
        shortcut,
      });
    }
  }
  const toggles: Array<[string, string, string, string]> = [
    ["grid.toggle", "grid", "Toggle Grid", "G"],
    ["ortho.toggle", "ortho", "Toggle Ortho", "F8"],
    ["osnap.toggle", "osnap", "Toggle Osnap", "F3"],
  ];
  for (const [id, statusId, label, shortcut] of toggles) {
    if (commands.has(id)) {
      continue;
    }
    commands.registerCommand(id, () => status.toggle(statusId), {
      label,
      shortcut,
    });
  }
}
