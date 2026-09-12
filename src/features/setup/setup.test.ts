import { describe, expect, it } from "bun:test";
import {
  isKnownFeature,
  resolveFeatures,
  resolveFeaturesOrThrow,
} from "../../workbench/features";
import { globalPresets } from "../../workbench/layouts";
import {
  EMPTY_SETUP_DATA,
  type SetupDemoData,
  validateConfigure,
  validateConnect,
  validateReview,
} from "./setupDemo";
import "./setupPreset";
import { setupPreset } from "./setupPreset";

function demoData(patch: Partial<SetupDemoData>): SetupDemoData {
  return { ...EMPTY_SETUP_DATA, ...patch };
}

describe("setup preset defaults", () => {
  it("resolves defaults without errors", () => {
    const { features, errors } = resolveFeatures(setupPreset);
    expect(errors).toEqual([]);
    expect(features).toEqual([
      "toolbar",
      "step-rail",
      "viewport",
      "wizard-nav",
      "statusbar",
    ]);
  });

  it("is registered under the setup layout id", () => {
    expect(globalPresets.has("setup")).toBe(true);
    expect(globalPresets.get("setup")?.slots.left).toContain("step-rail");
    expect(globalPresets.get("setup")?.slots.bottom).toContain("wizard-nav");
  });

  it("declares no right slot: no inspector, no ribbon", () => {
    expect(setupPreset.slots.right).toEqual([]);
    expect(setupPreset.slots.top).not.toContain("ribbon");
  });
});

describe("setup feature ids", () => {
  it("recognizes the wizard feature ids", () => {
    expect(isKnownFeature("step-rail")).toBe(true);
    expect(isKnownFeature("wizard-nav")).toBe(true);
  });

  it("hosts every setup id in the preset slots", () => {
    for (const id of ["step-rail", "wizard-nav"] as const) {
      const { errors } = resolveFeatures(setupPreset, { with: [id] });
      expect(errors).toEqual([]);
    }
  });

  it("rejects unknown with/without ids", () => {
    const { errors } = resolveFeatures(setupPreset, {
      // @ts-expect-error probe: unknown feature ids are rejected
      with: ["teleport"],
      // @ts-expect-error probe: unknown feature ids are rejected
      without: ["cloak"],
    });
    expect(errors).toHaveLength(2);
  });
});

describe("setup validation", () => {
  it("errors when the viewport is disabled", () => {
    const { errors } = resolveFeatures(setupPreset, {
      without: ["viewport"],
    });
    expect(errors.join("\n")).toMatch(
      'Feature "viewport" is load-bearing for preset "setup"',
    );
  });

  it("throws a readable error through resolveFeaturesOrThrow", () => {
    expect(() =>
      resolveFeaturesOrThrow(setupPreset, { without: ["viewport"] }),
    ).toThrow('Invalid feature combination for preset "setup"');
  });

  it("stays coherent when wizard chrome drops", () => {
    const { features, errors } = resolveFeatures(setupPreset, {
      without: ["step-rail", "wizard-nav"],
    });
    expect(errors).toEqual([]);
    expect(features).not.toContain("step-rail");
    expect(features).toContain("viewport");
  });
});

describe("setup demo gates", () => {
  it("blocks connect until name and address are valid", () => {
    expect(validateConnect(demoData({})).canProceed).toBe(false);
    expect(
      validateConnect(demoData({ displayName: "Field laptop" })).canProceed,
    ).toBe(false);
    expect(
      validateConnect(
        demoData({
          displayName: "Field laptop",
          workspaceUrl: "https://example.local",
        }),
      ).canProceed,
    ).toBe(true);
  });

  it("explains the connect blocker", () => {
    expect(validateConnect(demoData({})).disabledReason).toBe(
      "Enter a workspace name.",
    );
  });

  it("blocks configure outside 1-90 days of retention", () => {
    expect(validateConfigure(demoData({})).canProceed).toBe(true);
    expect(validateConfigure(demoData({ retentionDays: "0" })).canProceed).toBe(
      false,
    );
    expect(
      validateConfigure(demoData({ retentionDays: "91" })).canProceed,
    ).toBe(false);
    expect(
      validateConfigure(demoData({ retentionDays: "lots" })).canProceed,
    ).toBe(false);
  });

  it("blocks review until the summary is confirmed", () => {
    expect(validateReview(demoData({})).canProceed).toBe(false);
    expect(validateReview(demoData({ confirmed: true })).canProceed).toBe(true);
  });
});
