import { describe, expect, it } from "bun:test";
import {
  createFeatureRegistry,
  isKnownFeature,
  resolveFeatures,
  resolveFeaturesOrThrow,
  validatePresetCombination,
} from "./features";
import type { LayoutPreset } from "./types";

const technicalRibbonLike: LayoutPreset = {
  id: "technical-ribbon",
  label: "Technical Ribbon",
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

describe("resolveFeatures defaults", () => {
  it("returns the preset defaults untouched", () => {
    const { features, errors } = resolveFeatures(technicalRibbonLike);
    expect(errors).toEqual([]);
    expect(features).toEqual([
      "ribbon",
      "tool-rail",
      "viewport",
      "inspector",
      "command-bar",
      "statusbar",
    ]);
  });
});

describe("resolveFeatures with/without overrides", () => {
  it("removes features listed in without", () => {
    const { features, errors } = resolveFeatures(technicalRibbonLike, {
      without: ["inspector"],
    });
    expect(errors).toEqual([]);
    expect(features).not.toContain("inspector");
    expect(features).toContain("viewport");
  });

  it("supports removing the ribbon while staying coherent", () => {
    const { features, errors } = resolveFeatures(technicalRibbonLike, {
      without: ["ribbon"],
    });
    expect(errors).toEqual([]);
    expect(features).not.toContain("ribbon");
  });

  it("ignores a with entry that is already a default", () => {
    const { features, errors } = resolveFeatures(technicalRibbonLike, {
      with: ["ribbon"],
    });
    expect(errors).toEqual([]);
    expect(features.filter((id) => id === "ribbon")).toHaveLength(1);
  });

  it("reports unknown ids in with and without", () => {
    const { features, errors } = resolveFeatures(technicalRibbonLike, {
      // @ts-expect-error probe: unknown feature ids are rejected
      with: ["teleport"],
      // @ts-expect-error probe: unknown feature ids are rejected
      without: ["cloak"],
    });
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch('Unknown feature id in "without": "cloak"');
    expect(errors[1]).toMatch('Unknown feature id in "with": "teleport"');
    expect(features).toEqual(technicalRibbonLike.defaultFeatures);
  });
});

describe("validatePresetCombination", () => {
  it("rejects disabling the load-bearing viewport", () => {
    const errors = validatePresetCombination(technicalRibbonLike, ["ribbon"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      'Feature "viewport" is load-bearing for preset "technical-ribbon"',
    );
  });

  it("rejects features the preset slots cannot host", () => {
    const errors = validatePresetCombination(technicalRibbonLike, [
      ...technicalRibbonLike.defaultFeatures,
      "activity-bar",
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      'Feature "activity-bar" cannot be hosted by preset "technical-ribbon"',
    );
  });

  it("rejects unknown feature ids", () => {
    const errors = validatePresetCombination(technicalRibbonLike, [
      ...technicalRibbonLike.defaultFeatures,
      "teleport" as never,
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch('Unknown feature id: "teleport"');
  });
});

describe("resolveFeaturesOrThrow", () => {
  it("returns features for coherent combinations", () => {
    expect(
      resolveFeaturesOrThrow(technicalRibbonLike, {
        without: ["inspector"],
      }),
    ).not.toContain("inspector");
  });

  it("throws a readable error for incoherent combinations", () => {
    expect(() =>
      resolveFeaturesOrThrow(technicalRibbonLike, {
        without: ["viewport"],
      }),
    ).toThrow('Invalid feature combination for preset "technical-ribbon"');
  });
});

describe("per-preset loadBearing", () => {
  const viewportFree: LayoutPreset = {
    id: "forms-like",
    label: "Forms-like",
    slots: {
      top: ["toolbar"],
      left: [],
      center: ["form"],
      right: [],
      bottom: ["status-bar"],
    },
    defaultFeatures: ["toolbar", "form", "statusbar"],
    loadBearing: ["form"],
  };

  it("prefers preset.loadBearing over the viewport default", () => {
    const errors = validatePresetCombination(viewportFree, [
      "toolbar",
      "form",
      "statusbar",
    ]);
    expect(errors).toEqual([]);
    expect(
      validatePresetCombination(viewportFree, ["toolbar", "statusbar"])[0],
    ).toMatch('Feature "form" is load-bearing for preset "forms-like"');
  });

  it("keeps the viewport default when loadBearing is absent", () => {
    expect(
      validatePresetCombination(technicalRibbonLike, ["ribbon"])[0],
    ).toMatch('Feature "viewport" is load-bearing');
  });

  it("enforces the fallback chain in app registries too", () => {
    const registry = createFeatureRegistry();
    expect(() =>
      registry.resolveFeaturesOrThrow(viewportFree, {
        without: ["form"],
      }),
    ).toThrow('Feature "form" is load-bearing for preset "forms-like"');
  });
});

describe("isKnownFeature", () => {
  it("recognizes known features and rejects the rest", () => {
    expect(isKnownFeature("ribbon")).toBe(true);
    expect(isKnownFeature("form")).toBe(true);
    expect(isKnownFeature("data-table")).toBe(true);
    expect(isKnownFeature("detail")).toBe(true);
    expect(isKnownFeature("teleport")).toBe(false);
  });
});

describe("createFeatureRegistry", () => {
  it("registers an app feature without editing the core", () => {
    const registry = createFeatureRegistry();
    registry.registerFeature({
      id: "gcode-console",
      capabilities: ["console"],
    });
    expect(registry.isKnownFeature("gcode-console")).toBe(true);
    expect(registry.capabilitiesOf("gcode-console")).toEqual(["console"]);
    expect(registry.knownFeatures()).toContain("gcode-console");
    expect(registry.knownFeatures()).toContain("viewport");
    expect(isKnownFeature("gcode-console")).toBe(false);
  });

  it("rejects duplicate core and app ids fail-fast", () => {
    const registry = createFeatureRegistry();
    expect(() =>
      registry.registerFeature({ id: "viewport", capabilities: ["viewport"] }),
    ).toThrow('Duplicate feature id: "viewport"');
    registry.registerFeature({
      id: "gcode-console",
      capabilities: ["console"],
    });
    expect(() =>
      registry.registerFeature({
        id: "gcode-console",
        capabilities: ["console"],
      }),
    ).toThrow('Duplicate feature id: "gcode-console"');
  });

  it("rejects empty ids and empty capability lists", () => {
    const registry = createFeatureRegistry();
    expect(() =>
      registry.registerFeature({ id: "  ", capabilities: ["console"] }),
    ).toThrow("Feature id must be a non-empty string.");
    expect(() =>
      registry.registerFeature({ id: "gcode-console", capabilities: [] }),
    ).toThrow(
      'Feature "gcode-console" must declare at least one hosting capability.',
    );
  });

  it("resolves app features hosted by the preset slots", () => {
    const registry = createFeatureRegistry();
    registry.registerFeature({
      id: "gcode-console",
      capabilities: ["console"],
    });
    const ideLike = {
      ...technicalRibbonLike,
      id: "ide-like",
      slots: {
        ...technicalRibbonLike.slots,
        bottom: [...technicalRibbonLike.slots.bottom, "console"],
      },
    };
    const { features, errors } = registry.resolveFeatures(ideLike, {
      with: ["gcode-console"],
    });
    expect(errors).toEqual([]);
    expect(features).toContain("gcode-console");
  });

  it("reports app features no preset slot can host", () => {
    const registry = createFeatureRegistry();
    registry.registerFeature({
      id: "gcode-console",
      capabilities: ["console"],
    });
    const { errors } = registry.resolveFeatures(technicalRibbonLike, {
      with: ["gcode-console"],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      'Feature "gcode-console" cannot be hosted by preset "technical-ribbon"',
    );
  });

  it("keeps load-bearing validation for app registries", () => {
    const registry = createFeatureRegistry();
    expect(() =>
      registry.resolveFeaturesOrThrow(technicalRibbonLike, {
        without: ["viewport"],
      }),
    ).toThrow('Invalid feature combination for preset "technical-ribbon"');
  });

  it("keeps registries isolated from each other", () => {
    const a = createFeatureRegistry();
    const b = createFeatureRegistry();
    a.registerFeature({ id: "gcode-console", capabilities: ["console"] });
    expect(a.isKnownFeature("gcode-console")).toBe(true);
    expect(b.isKnownFeature("gcode-console")).toBe(false);
  });
});
