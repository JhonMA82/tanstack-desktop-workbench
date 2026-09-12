import { describe, expect, it } from "bun:test";
import {
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

describe("isKnownFeature", () => {
  it("recognizes known features and rejects the rest", () => {
    expect(isKnownFeature("ribbon")).toBe(true);
    expect(isKnownFeature("teleport")).toBe(false);
  });
});
