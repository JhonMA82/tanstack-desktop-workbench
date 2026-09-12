import { describe, expect, it } from "bun:test";
import {
  createLayoutRegistry,
  createLegacyLayoutAdapter,
  createPresetRegistry,
  migrateLegacyLayoutToPreset,
} from "../layouts";

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

const adapterSlots = {
  top: ["ribbon"],
  left: ["tool-rail"],
  center: ["viewport"],
  right: ["inspector"],
  bottom: ["command-bar", "status-bar"],
};

describe("legacy layout migration", () => {
  it("migrates rail/right/bottom widgets to hosting capabilities", () => {
    const preset = migrateLegacyLayoutToPreset({
      id: "legacy",
      name: "Legacy",
      railTools: ["select"],
      rightWidgets: ["properties"],
      bottomWidgets: ["console"],
    });
    expect(preset.id).toBe("legacy");
    expect(preset.label).toBe("Legacy");
    expect(preset.slots.center).toEqual(["viewport"]);
    expect(preset.slots.left).toEqual(["tool-rail"]);
    expect(preset.slots.right).toEqual(["inspector"]);
    expect(preset.slots.bottom).toEqual(["bottom-panel"]);
    expect(preset.defaultFeatures).toContain("viewport");
  });

  it("migrates an empty legacy layout to a viewport-only preset", () => {
    const preset = migrateLegacyLayoutToPreset({
      id: "empty",
      name: "Empty",
    });
    expect(preset.slots.left).toEqual([]);
    expect(preset.slots.right).toEqual([]);
    expect(preset.slots.bottom).toEqual([]);
    expect(preset.defaultFeatures).toEqual(["viewport"]);
  });
});

describe("legacy layout adapter", () => {
  it("reads presets as layout views from a single store", () => {
    const presets = createPresetRegistry();
    const layouts = createLegacyLayoutAdapter(presets);
    presets.registerPreset({
      id: "custom",
      label: "Custom",
      slots: adapterSlots,
      defaultFeatures: [],
    });
    expect(layouts.has("custom")).toBe(true);
    expect(layouts.get("custom")).toMatchObject({
      id: "custom",
      name: "Custom",
    });
    expect(layouts.getActive()?.id).toBe("custom");
    expect(layouts.list().map((layout) => layout.id)).toEqual(["custom"]);
  });

  it("migrates legacy registrations into the preset store", () => {
    const presets = createPresetRegistry();
    const layouts = createLegacyLayoutAdapter(presets);
    layouts.registerLayout({ id: "legacy", name: "Legacy" });
    expect(presets.has("legacy")).toBe(true);
    expect(layouts.get("legacy")?.name).toBe("Legacy");
  });

  it("rejects a legacy registration that duplicates a preset", () => {
    const presets = createPresetRegistry();
    const layouts = createLegacyLayoutAdapter(presets);
    presets.registerPreset({
      id: "custom",
      label: "Custom",
      slots: adapterSlots,
      defaultFeatures: [],
    });
    expect(() =>
      layouts.registerLayout({ id: "custom", name: "Custom" }),
    ).toThrow('Duplicate layout id: "custom"');
  });

  it("rejects activating unknown layouts", () => {
    const layouts = createLegacyLayoutAdapter(createPresetRegistry());
    expect(() => layouts.setActive("missing")).toThrow(
      'Unknown layout id: "missing"',
    );
  });
});
