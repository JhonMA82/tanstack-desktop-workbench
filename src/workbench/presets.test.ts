import { describe, expect, it } from "bun:test";
import "../features/ide/idePreset";
import { idePreset } from "../features/ide/idePreset";
import "../features/forms/formsPreset";
import { formsPreset } from "../features/forms/formsPreset";
import "../features/minimal/minimalPreset";
import { minimalPreset } from "../features/minimal/minimalPreset";
import "../features/monitoring/monitoringPreset";
import { monitoringPreset } from "../features/monitoring/monitoringPreset";
import "../features/records/recordsPreset";
import { recordsPreset } from "../features/records/recordsPreset";
import "../features/operator/operatorPreset";
import { operatorPreset } from "../features/operator/operatorPreset";
import "../features/setup/setupPreset";
import { setupPreset } from "../features/setup/setupPreset";
import "../features/settings/settingsPreset";
import { settingsPreset } from "../features/settings/settingsPreset";
import "../features/studio/studioPreset";
import { studioPreset } from "../features/studio/studioPreset";
import "../features/technical-ribbon/technicalRibbonLayout";
import {
  isKnownFeature,
  resolveFeatures,
  resolveFeaturesOrThrow,
} from "./features";
import { globalPresets } from "./layouts";
import type { FeatureId, LayoutPreset } from "./types";

const allPresets: LayoutPreset[] = [
  idePreset,
  studioPreset,
  operatorPreset,
  monitoringPreset,
  setupPreset,
  minimalPreset,
  formsPreset,
  recordsPreset,
  settingsPreset,
];

const expectedDefaults: Record<string, FeatureId[]> = {
  ide: [
    "toolbar",
    "activity-bar",
    "explorer",
    "viewport",
    "tabs",
    "bottom-panel",
    "console",
    "output",
    "statusbar",
  ],
  studio: [
    "workspace-selector",
    "toolbar",
    "hierarchy",
    "explorer",
    "viewport",
    "inspector",
    "timeline",
    "bottom-panel",
  ],
  operator: [
    "system-status",
    "navigation",
    "viewport",
    "controls",
    "alarms",
    "notifications",
    "statusbar",
  ],
  monitoring: [
    "system-summary",
    "source-nav",
    "tile-wall",
    "viewport",
    "alert-strip",
    "event-stream",
    "statusbar",
  ],
  setup: ["toolbar", "step-rail", "viewport", "wizard-nav", "statusbar"],
  minimal: ["toolbar", "viewport", "statusbar"],
  forms: ["toolbar", "navigation", "form", "inspector", "statusbar"],
  records: ["toolbar", "navigation", "data-table", "detail", "statusbar"],
  settings: ["toolbar", "form", "statusbar"],
};

describe("preset defaults", () => {
  for (const preset of allPresets) {
    it(`resolves ${preset.id} defaults without errors`, () => {
      const { features, errors } = resolveFeatures(preset);
      expect(errors).toEqual([]);
      expect(features).toEqual(expectedDefaults[preset.id]);
    });
  }
});

describe("preset registration", () => {
  it("registers all ten presets and no legacy ids", () => {
    for (const id of [
      "technical-ribbon",
      "ide",
      "studio",
      "operator",
      "monitoring",
      "setup",
      "minimal",
      "forms",
      "records",
      "settings",
    ]) {
      expect(globalPresets.has(id)).toBe(true);
    }
    expect(globalPresets.has("cad")).toBe(false);
  });
});

describe("new feature ids", () => {
  const newIds: FeatureId[] = [
    "navigation",
    "controls",
    "alarms",
    "system-status",
    "hierarchy",
    "timeline",
    "workspace-selector",
    "tile-wall",
    "alert-strip",
    "event-stream",
    "system-summary",
    "source-nav",
    "step-rail",
    "wizard-nav",
    "form",
    "data-table",
    "detail",
  ];

  it("recognizes every new feature id", () => {
    for (const id of newIds) {
      expect(isKnownFeature(id)).toBe(true);
    }
  });

  it("hosts every new id in at least one preset's slots", () => {
    for (const id of newIds) {
      const hosted = allPresets.some((preset) =>
        resolveFeatures(preset, { with: [id] }).errors.every(
          (error) => !error.includes(`Feature "${id}" cannot be hosted`),
        ),
      );
      expect(hosted).toBe(true);
    }
  });

  it("reports unknown with/without ids for the new presets", () => {
    const { errors } = resolveFeatures(idePreset, {
      // @ts-expect-error probe: unknown feature ids are rejected
      with: ["teleport"],
      // @ts-expect-error probe: unknown feature ids are rejected
      without: ["cloak"],
    });
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch('Unknown feature id in "without": "cloak"');
    expect(errors[1]).toMatch('Unknown feature id in "with": "teleport"');
  });
});

describe("load-bearing workspace", () => {
  it("errors when minimal drops the viewport", () => {
    const { errors } = resolveFeatures(minimalPreset, {
      without: ["viewport"],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(
      'Feature "viewport" is load-bearing for preset "minimal"',
    );
  });

  it("throws a readable error through resolveFeaturesOrThrow", () => {
    expect(() =>
      resolveFeaturesOrThrow(minimalPreset, { without: ["viewport"] }),
    ).toThrow('Invalid feature combination for preset "minimal"');
  });

  it("stays coherent when operator drops an optional capability", () => {
    const { features, errors } = resolveFeatures(operatorPreset, {
      without: ["notifications"],
    });
    expect(errors).toEqual([]);
    expect(features).not.toContain("notifications");
    expect(features).toContain("viewport");
  });

  it("errors when forms drops its load-bearing form", () => {
    const { errors } = resolveFeatures(formsPreset, {
      without: ["form"],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(
      'Feature "form" is load-bearing for preset "forms"',
    );
  });

  it("errors when records drops its load-bearing data table", () => {
    const { errors } = resolveFeatures(recordsPreset, {
      without: ["data-table"],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(
      'Feature "data-table" is load-bearing for preset "records"',
    );
  });

  it("errors when settings drops its load-bearing form", () => {
    const { errors } = resolveFeatures(settingsPreset, {
      without: ["form"],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(
      'Feature "form" is load-bearing for preset "settings"',
    );
  });

  it("needs no viewport in viewport-free presets", () => {
    for (const preset of [formsPreset, recordsPreset, settingsPreset]) {
      const { features, errors } = resolveFeatures(preset);
      expect(errors).toEqual([]);
      expect(features).not.toContain("viewport");
    }
  });
});

describe("rename integrity", () => {
  it("keeps preset ids free of product names", () => {
    for (const preset of allPresets) {
      expect(preset.id).not.toMatch(/code|vscode|autocad|studio-pad/i);
    }
  });
});
