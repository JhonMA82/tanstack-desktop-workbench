import { describe, expect, it } from "bun:test";
import {
  createCommandRegistry,
  setUnhandledCommandErrorHandler,
} from "../commands";

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

  it("fires async handlers without changing the sync execute contract", async () => {
    const registry = createCommandRegistry();
    let done = false;
    registry.registerCommand("save", async () => {
      await Promise.resolve();
      done = true;
    });
    expect(registry.execute("save")).toBe(true);
    expect(registry.history()).toEqual(["save"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(done).toBe(true);
  });

  it("records history even when an async handler rejects", async () => {
    const registry = createCommandRegistry();
    registry.registerCommand("failing", async () => {
      throw new Error("boom");
    });
    expect(registry.execute("failing")).toBe(true);
    expect(registry.history()).toEqual(["failing"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("reports async rejections instead of swallowing them", async () => {
    const registry = createCommandRegistry();
    const seen: Array<{ id: string; error: unknown }> = [];
    setUnhandledCommandErrorHandler((event) => {
      seen.push(event);
    });
    try {
      registry.registerCommand("failing", async () => {
        throw new Error("boom");
      });
      expect(registry.execute("failing")).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(seen.length).toBe(1);
      expect(seen[0]?.id).toBe("failing");
      expect(String(seen[0]?.error)).toContain("boom");
    } finally {
      setUnhandledCommandErrorHandler(undefined);
    }
  });
});
