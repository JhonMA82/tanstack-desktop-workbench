import { describe, expect, it } from "bun:test";
import { createCommandRegistry } from "../../workbench/commands";
import { createStatusRegistry } from "../../workbench/status";
import { createToolRegistry } from "../../workbench/tools";
import {
  getSelectedTechnicalRibbonToolId,
  getTechnicalRibbonToolSync,
  registerTechnicalRibbonCommands,
  shouldSyncTechnicalRibbonTool,
  subscribeSelectedTechnicalRibbonToolId,
} from "./technicalRibbonCommands";
import { registerTechnicalRibbonStatus } from "./technicalRibbonStatus";
import { registerTechnicalRibbonTools } from "./technicalRibbonTools";

function setupFresh() {
  const commands = createCommandRegistry();
  const status = createStatusRegistry();
  const tools = createToolRegistry();
  registerTechnicalRibbonTools(tools);
  registerTechnicalRibbonStatus(status);
  registerTechnicalRibbonCommands(commands, status, tools);
  return { commands, status, tools };
}

describe("technical ribbon commands", () => {
  it("starts with no tool selected on fresh registries", () => {
    const { tools } = setupFresh();
    expect(getSelectedTechnicalRibbonToolId(tools)).toBeNull();
  });

  it("selects the line tool when draw.line executes", () => {
    const { commands, tools } = setupFresh();
    expect(commands.execute("draw.line")).toBe(true);
    expect(getSelectedTechnicalRibbonToolId(tools)).toBe("line");
  });

  it("maps tool commands to their tools", () => {
    const { commands, tools } = setupFresh();
    const cases: Array<[string, string]> = [
      ["tool.select", "select"],
      ["draw.circle", "circle"],
      ["draw.rect", "rect"],
      ["modify.move", "move"],
      ["layer.props", "layers"],
      ["annotate.text", "text"],
      ["annotate.dim", "dim"],
      ["view.zoom", "zoom"],
      ["view.pan", "pan"],
    ];
    for (const [commandId, toolId] of cases) {
      expect(commands.execute(commandId)).toBe(true);
      expect(getSelectedTechnicalRibbonToolId(tools)).toBe(toolId);
    }
  });

  it("notifies subscribers on selection changes", () => {
    const { commands, tools } = setupFresh();
    const seen: Array<string | null> = [];
    const unsubscribe = subscribeSelectedTechnicalRibbonToolId(tools, () => {
      seen.push(getSelectedTechnicalRibbonToolId(tools));
    });
    commands.execute("draw.line");
    commands.execute("draw.line");
    unsubscribe();
    commands.execute("draw.circle");
    // Second draw.line is idempotent: same value, no second notification.
    expect(seen).toEqual(["line"]);
  });

  it("keeps tool-less actions and app commands as documented no-ops", () => {
    const { commands, tools } = setupFresh();
    for (const commandId of ["view.reset", "view.zoom-in", "view.zoom-out"]) {
      expect(commands.execute(commandId)).toBe(true);
      expect(getSelectedTechnicalRibbonToolId(tools)).toBeNull();
    }
    // app.* commands never hijack the active tool, even with tools registered.
    for (const commandId of ["app.load", "app.script", "app.cui"]) {
      expect(commands.execute(commandId)).toBe(true);
      expect(getSelectedTechnicalRibbonToolId(tools)).toBeNull();
    }
  });

  it("toggles drawing aids through the status registry", () => {
    const { commands, status } = setupFresh();
    expect(status.isActive("grid")).toBe(true);
    expect(commands.execute("grid.toggle")).toBe(true);
    expect(status.isActive("grid")).toBe(false);
    expect(commands.execute("grid.toggle")).toBe(true);
    expect(status.isActive("grid")).toBe(true);
    expect(status.isActive("ortho")).toBe(false);
    expect(commands.execute("ortho.toggle")).toBe(true);
    expect(status.isActive("ortho")).toBe(true);
    expect(commands.execute("osnap.toggle")).toBe(true);
    expect(status.isActive("osnap")).toBe(false);
  });

  it("keeps shortcut metadata on commands and status items", () => {
    const { commands, status } = setupFresh();
    const expected: Array<[string, string]> = [
      ["draw.line", "L"],
      ["draw.circle", "C"],
      ["modify.move", "M"],
      ["view.zoom", "Z"],
      ["view.pan", "P"],
      ["tool.select", "V"],
      ["grid.toggle", "G"],
      ["ortho.toggle", "F8"],
      ["osnap.toggle", "F3"],
    ];
    for (const [commandId, shortcut] of expected) {
      expect(commands.get(commandId)?.shortcut).toBe(shortcut);
    }
    expect(status.get("grid")?.shortcut).toBe("G");
    expect(status.get("ortho")?.shortcut).toBe("F8");
    expect(status.get("osnap")?.shortcut).toBe("F3");
  });

  it("registers idempotently without duplicate-id errors", () => {
    const { commands, status, tools } = setupFresh();
    expect(() =>
      registerTechnicalRibbonCommands(commands, status, tools),
    ).not.toThrow();
    expect(commands.execute("draw.line")).toBe(true);
    expect(getSelectedTechnicalRibbonToolId(tools)).toBe("line");
  });

  it("exposes an external-store sync over the selection", () => {
    const { commands, tools } = setupFresh();
    const sync = getTechnicalRibbonToolSync(tools);
    expect(sync.getSnapshot()).toBeNull();
    const seen: Array<string | null> = [];
    const unsubscribe = sync.subscribe(() => {
      seen.push(sync.getSnapshot());
    });
    commands.execute("draw.line");
    expect(sync.getSnapshot()).toBe("line");
    unsubscribe();
    commands.execute("draw.circle");
    expect(seen).toEqual(["line"]);
  });

  it("guards the ToolProvider bridge against loops", () => {
    // No selection: mount stays a no-op.
    expect(shouldSyncTechnicalRibbonTool(null, "select")).toBe(false);
    expect(shouldSyncTechnicalRibbonTool(null, null)).toBe(false);
    // Selection coincides with the active tool: no selectTool call.
    expect(shouldSyncTechnicalRibbonTool("line", "line")).toBe(false);
    // Selection differs: the bridge syncs once.
    expect(shouldSyncTechnicalRibbonTool("line", "select")).toBe(true);
    expect(shouldSyncTechnicalRibbonTool("line", null)).toBe(true);
  });
});
