import { describe, expect, it } from "bun:test";
import { createLayoutRegistry, createPresetRegistry } from "../layouts";

describe("layout registry", () => {
  it("registers layouts and activates the first one", () => {
    const registry = createLayoutRegistry();
    registry.registerLayout({ id: "primary", name: "Primary" });
    registry.registerLayout({ id: "monitoring", name: "Monitoring" });
    expect(registry.getActive()?.id).toBe("primary");
    expect(registry.list().map((layout) => layout.id)).toEqual([
      "primary",
      "monitoring",
    ]);
  });

  it("switches the active layout", () => {
    const registry = createLayoutRegistry();
    registry.registerLayout({ id: "primary", name: "Primary" });
    registry.registerLayout({ id: "secondary", name: "Secondary" });
    registry.setActive("secondary");
    expect(registry.getActive()?.id).toBe("secondary");
  });

  it("rejects duplicate ids", () => {
    const registry = createLayoutRegistry();
    registry.registerLayout({ id: "primary", name: "Primary" });
    expect(() =>
      registry.registerLayout({ id: "primary", name: "Primary" }),
    ).toThrow('Duplicate layout id: "primary"');
  });

  it("rejects activating unknown layouts", () => {
    const registry = createLayoutRegistry();
    expect(() => registry.setActive("missing")).toThrow(
      'Unknown layout id: "missing"',
    );
  });
});

describe("preset registry", () => {
  const slots = {
    top: ["ribbon"],
    left: ["tool-rail"],
    center: ["viewport"],
    right: ["inspector"],
    bottom: ["command-bar", "status-bar"],
  };

  it("registers and lists presets", () => {
    const registry = createPresetRegistry();
    registry.registerPreset({
      id: "technical-ribbon",
      label: "Technical Ribbon",
      slots,
      defaultFeatures: ["ribbon", "viewport"],
    });
    expect(registry.has("technical-ribbon")).toBe(true);
    expect(registry.get("technical-ribbon")?.label).toBe("Technical Ribbon");
    expect(registry.list().map((preset) => preset.id)).toEqual([
      "technical-ribbon",
    ]);
  });

  it("rejects duplicate preset ids", () => {
    const registry = createPresetRegistry();
    registry.registerPreset({
      id: "technical-ribbon",
      label: "Technical Ribbon",
      slots,
      defaultFeatures: [],
    });
    expect(() =>
      registry.registerPreset({
        id: "technical-ribbon",
        label: "Technical Ribbon",
        slots,
        defaultFeatures: [],
      }),
    ).toThrow('Duplicate layout preset id: "technical-ribbon"');
  });

  it("returns undefined for unknown presets", () => {
    const registry = createPresetRegistry();
    expect(registry.get("missing")).toBeUndefined();
    expect(registry.has("missing")).toBe(false);
  });
});
