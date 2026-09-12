import { describe, expect, it } from "bun:test";
import { createCommandRegistry } from "../commands";

describe("command registry", () => {
  it("registers and executes a command", () => {
    const registry = createCommandRegistry();
    let calls = 0;
    registry.registerCommand("view.reset", () => {
      calls += 1;
    });
    expect(registry.has("view.reset")).toBe(true);
    expect(registry.execute("view.reset")).toBe(true);
    expect(calls).toBe(1);
  });

  it("passes args to the command", () => {
    const registry = createCommandRegistry();
    let received: unknown;
    registry.registerCommand("echo", (args) => {
      received = args;
    });
    registry.execute("echo", { toolId: "line" });
    expect(received).toEqual({ toolId: "line" });
  });

  it("returns false for unknown commands", () => {
    const registry = createCommandRegistry();
    expect(registry.execute("missing.command")).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const registry = createCommandRegistry();
    registry.registerCommand("dup", () => undefined);
    expect(() => registry.registerCommand("dup", () => undefined)).toThrow(
      'Duplicate command id: "dup"',
    );
  });

  it("records execution history", () => {
    const registry = createCommandRegistry();
    registry.registerCommand("a", () => undefined);
    registry.registerCommand("b", () => undefined);
    registry.execute("a");
    registry.execute("b");
    registry.execute("nope");
    expect(registry.history()).toEqual(["a", "b"]);
  });
});
