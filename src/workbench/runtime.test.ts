import { describe, expect, it } from "bun:test";
import { globalCommands } from "./commands";
import { globalFeatures } from "./features";
import { globalLayouts, globalPresets } from "./layouts";
import { createWorkbenchRuntime, globalRuntime } from "./runtime";
import { globalStatus } from "./status";
import { globalTools } from "./tools";
import type { LayoutPreset } from "./types";
import { globalWidgets } from "./widgets";

const customPreset: LayoutPreset = {
  id: "custom",
  label: "Custom",
  slots: {
    top: ["ribbon"],
    left: ["tool-rail"],
    center: ["viewport"],
    right: ["inspector"],
    bottom: ["command-bar", "status-bar"],
  },
  defaultFeatures: [
    "ribbon",
    "tool-rail",
    "viewport",
    "inspector",
    "command-bar",
    "statusbar",
  ],
};

describe("workbench runtime isolation", () => {
  it("keeps commands isolated between runtimes", () => {
    const a = createWorkbenchRuntime();
    const b = createWorkbenchRuntime();
    a.commands.registerCommand("demo.ping", () => undefined);
    expect(a.commands.has("demo.ping")).toBe(true);
    expect(b.commands.has("demo.ping")).toBe(false);
  });

  it("keeps presets, layouts, and app features isolated", () => {
    const a = createWorkbenchRuntime();
    const b = createWorkbenchRuntime();
    a.features.registerFeature({
      id: "gcode-console",
      capabilities: ["console"],
    });
    a.presets.registerPreset({ ...customPreset });
    expect(a.features.isKnownFeature("gcode-console")).toBe(true);
    expect(b.features.isKnownFeature("gcode-console")).toBe(false);
    expect(a.presets.has("custom")).toBe(true);
    expect(b.presets.has("custom")).toBe(false);
    expect(a.layouts.has("custom")).toBe(true);
    expect(b.layouts.has("custom")).toBe(false);
  });

  it("fires async commands without breaking the sync execute contract", async () => {
    const runtime = createWorkbenchRuntime();
    let done = false;
    runtime.commands.registerCommand("demo.async", async () => {
      await Promise.resolve();
      done = true;
    });
    expect(runtime.commands.execute("demo.async")).toBe(true);
    expect(runtime.commands.history()).toEqual(["demo.async"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(done).toBe(true);
  });

  it("wires the default runtime to the shared globals", () => {
    expect(globalRuntime.commands).toBe(globalCommands);
    expect(globalRuntime.widgets).toBe(globalWidgets);
    expect(globalRuntime.tools).toBe(globalTools);
    expect(globalRuntime.status).toBe(globalStatus);
    expect(globalRuntime.features).toBe(globalFeatures);
    expect(globalRuntime.presets).toBe(globalPresets);
    expect(globalRuntime.layouts).toBe(globalLayouts);
  });
});
