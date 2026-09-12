import type { FeatureId, LayoutPreset } from "./types";

export type { FeatureId };

/** Every feature id the workbench model knows about. */
export const KNOWN_FEATURES: readonly FeatureId[] = [
  "ribbon",
  "tool-rail",
  "viewport",
  "inspector",
  "command-bar",
  "statusbar",
  "explorer",
  "console",
  "output",
  "bottom-panel",
  "activity-bar",
  "tabs",
  "toolbar",
  "notifications",
  "command-palette",
  "secondary-sidebar",
  "navigation",
  "controls",
  "alarms",
  "system-status",
  "hierarchy",
  "timeline",
  "workspace-selector",
];

/**
 * Load-bearing capabilities: disabling one leaves the preset without a
 * workspace, so it is always a validation error, never a silent removal.
 */
const LOAD_BEARING_FEATURES: readonly FeatureId[] = ["viewport"];

/**
 * Slot capability ids that can host each feature. A preset hosts a feature
 * when any of its slots lists one of these capability ids.
 */
const FEATURE_CAPABILITIES: Record<FeatureId, readonly string[]> = {
  ribbon: ["ribbon"],
  "tool-rail": ["tool-rail"],
  viewport: ["viewport"],
  inspector: ["inspector"],
  "command-bar": ["command-bar"],
  statusbar: ["status-bar"],
  explorer: ["explorer"],
  console: ["console"],
  output: ["output"],
  "bottom-panel": ["bottom-panel"],
  "activity-bar": ["activity-bar"],
  tabs: ["tabs"],
  toolbar: ["toolbar"],
  notifications: ["notifications"],
  "command-palette": ["command-palette"],
  "secondary-sidebar": ["secondary-sidebar"],
  navigation: ["navigation"],
  controls: ["controls"],
  alarms: ["alarms"],
  "system-status": ["system-status"],
  hierarchy: ["hierarchy"],
  timeline: ["timeline"],
  "workspace-selector": ["workspace-selector"],
};

export interface FeatureOverrides {
  with?: FeatureId[];
  without?: FeatureId[];
}

export interface ResolvedFeatures {
  /** Effective feature set: preset defaults with overrides applied. */
  features: FeatureId[];
  /** Empty when the combination is coherent. */
  errors: string[];
}

/** True when the value is a known feature id. */
export function isKnownFeature(value: string): value is FeatureId {
  return (KNOWN_FEATURES as readonly string[]).includes(value);
}

/**
 * Validate an explicit feature set against a preset. Returns one error per
 * incoherent combination: unknown ids, disabled load-bearing capabilities,
 * or features no slot of the preset can host.
 */
export function validatePresetCombination(
  preset: LayoutPreset,
  features: readonly FeatureId[],
): string[] {
  const errors: string[] = [];
  const hosted = new Set(Object.values(preset.slots).flat());

  for (const feature of features) {
    if (!isKnownFeature(feature)) {
      errors.push(
        `Unknown feature id: "${feature}". Known features: ${KNOWN_FEATURES.join(", ")}.`,
      );
    }
  }

  for (const loadBearing of LOAD_BEARING_FEATURES) {
    if (!features.includes(loadBearing)) {
      errors.push(
        `Feature "${loadBearing}" is load-bearing for preset "${preset.id}" and cannot be disabled.`,
      );
    }
  }

  for (const feature of features) {
    if (!isKnownFeature(feature)) {
      continue;
    }
    const canHost = FEATURE_CAPABILITIES[feature].some((capability) =>
      hosted.has(capability),
    );
    if (!canHost) {
      errors.push(
        `Feature "${feature}" cannot be hosted by preset "${preset.id}": no slot declares a matching capability.`,
      );
    }
  }

  return errors;
}

/**
 * Resolve the effective feature set: preset defaults, minus `without`,
 * plus `with`. Unknown override ids are reported, never applied silently.
 */
export function resolveFeatures(
  preset: LayoutPreset,
  overrides: FeatureOverrides = {},
): ResolvedFeatures {
  const errors: string[] = [];
  const excluded = new Set<FeatureId>();
  const included: FeatureId[] = [];

  for (const id of overrides.without ?? []) {
    if (!isKnownFeature(id)) {
      errors.push(
        `Unknown feature id in "without": "${id}". Known features: ${KNOWN_FEATURES.join(", ")}.`,
      );
      continue;
    }
    excluded.add(id);
  }

  for (const id of overrides.with ?? []) {
    if (!isKnownFeature(id)) {
      errors.push(
        `Unknown feature id in "with": "${id}". Known features: ${KNOWN_FEATURES.join(", ")}.`,
      );
      continue;
    }
    if (!excluded.has(id) && !included.includes(id)) {
      included.push(id);
    }
  }

  const features = preset.defaultFeatures.filter(
    (id) => !excluded.has(id) && !included.includes(id),
  );
  features.push(...included);

  errors.push(...validatePresetCombination(preset, features));

  return { features, errors };
}

/** Resolve and throw a readable developer error when incoherent. */
export function resolveFeaturesOrThrow(
  preset: LayoutPreset,
  overrides: FeatureOverrides = {},
): FeatureId[] {
  const { features, errors } = resolveFeatures(preset, overrides);
  if (errors.length > 0) {
    throw new Error(
      `Invalid feature combination for preset "${preset.id}":\n- ${errors.join("\n- ")}`,
    );
  }
  return features;
}

/** True when the resolved set enables the feature. */
export function hasFeature(
  features: readonly FeatureId[],
  id: FeatureId,
): boolean {
  return features.includes(id);
}
