import { describe, expect, it } from "bun:test";
import "../features/technical-ribbon/technicalRibbonLayout";
import { technicalRibbonPreset } from "../features/technical-ribbon/technicalRibbonPreset";
import { resolveFeaturesOrThrow } from "../workbench/features";
import { globalLayouts, globalPresets } from "../workbench/layouts";
import { workbenchConfig } from "./workbench.config";

describe("workbench manifest", () => {
  it("declares the technical-ribbon layout", () => {
    expect(workbenchConfig.layout).toBe("technical-ribbon");
  });

  it("resolves the manifest layout to a registered preset", () => {
    const preset = globalPresets.get(workbenchConfig.layout);
    expect(preset).toBeDefined();
    expect(preset?.id).toBe(technicalRibbonPreset.id);
  });

  it("resolves the manifest features without errors", () => {
    const preset = globalPresets.get(workbenchConfig.layout);
    if (!preset) {
      throw new Error("Manifest preset is not registered");
    }
    const features = resolveFeaturesOrThrow(preset, workbenchConfig);
    expect(features).toContain("viewport");
  });
});

describe("technical-ribbon rename integrity", () => {
  it("registers technical-ribbon and drops the legacy preset id", () => {
    expect(globalPresets.has("technical-ribbon")).toBe(true);
    expect(globalPresets.has("cad")).toBe(false);
    expect(globalLayouts.has("technical-ribbon")).toBe(true);
    expect(globalLayouts.has("cad")).toBe(false);
  });
});
