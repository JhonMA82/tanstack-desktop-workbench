import { type CommandRegistry, globalCommands } from "../../workbench/commands";
import { globalStatus, type StatusRegistry } from "../../workbench/status";

/* Demo side-effects for demo commands. Toggles flip status items; everything
 * else is a deliberate no-op: the boilerplate ships no geometry engine. */

function noop(): void {
  /* demo: no domain logic */
}

export function registerTechnicalRibbonCommands(
  commands: CommandRegistry = globalCommands,
  status: StatusRegistry = globalStatus,
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
    commands.registerCommand(id, noop, { label, shortcut });
  }
  commands.registerCommand("grid.toggle", () => status.toggle("grid"), {
    label: "Toggle Grid",
    shortcut: "G",
  });
  commands.registerCommand("ortho.toggle", () => status.toggle("ortho"), {
    label: "Toggle Ortho",
    shortcut: "F8",
  });
  commands.registerCommand("osnap.toggle", () => status.toggle("osnap"), {
    label: "Toggle Osnap",
    shortcut: "F3",
  });
}
