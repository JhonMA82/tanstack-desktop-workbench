import { describe, expect, it } from "bun:test";
import { Slash } from "lucide-react";
import { createToolRegistry } from "../tools";

describe("tool registry", () => {
  it("registers and resolves a tool", () => {
    const registry = createToolRegistry();
    registry.registerTool({
      id: "line",
      label: "Line",
      icon: Slash,
      command: "draw.line",
      group: "draw",
    });
    expect(registry.has("line")).toBe(true);
    expect(registry.get("line")?.command).toBe("draw.line");
  });

  it("rejects duplicate ids", () => {
    const registry = createToolRegistry();
    const tool = {
      id: "line",
      label: "Line",
      icon: Slash,
      command: "draw.line",
    };
    registry.registerTool(tool);
    expect(() => registry.registerTool(tool)).toThrow(
      'Duplicate tool id: "line"',
    );
  });

  it("lists tools by group", () => {
    const registry = createToolRegistry();
    registry.registerTool({
      id: "line",
      label: "Line",
      icon: Slash,
      command: "draw.line",
      group: "draw",
    });
    registry.registerTool({
      id: "move",
      label: "Move",
      icon: Slash,
      command: "modify.move",
      group: "modify",
    });
    expect(registry.listByGroup("draw").map((tool) => tool.id)).toEqual([
      "line",
    ]);
    expect(registry.list()).toHaveLength(2);
  });

  it("returns undefined for unknown tools", () => {
    const registry = createToolRegistry();
    expect(registry.get("missing")).toBeUndefined();
  });
});
