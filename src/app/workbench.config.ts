import type { FeatureId } from "../workbench/types";

/**
 * Application manifest: declarative description of this workbench instance.
 * The manifest declares app metadata (name, preset, with/without, theme);
 * materializing a new application from it is the job of the project
 * generator, not of manual edits. Known preset ids: technical-ribbon, ide,
 * studio, operator, monitoring, setup, minimal; the with/without model
 * adjusts the preset defaults while keeping the combination coherent.
 */
export type WorkbenchLayoutId =
  | "technical-ribbon"
  | "ide"
  | "studio"
  | "operator"
  | "monitoring"
  | "setup"
  | "minimal";

/** Theme id (see src/styles/themes/*.css). Applied to <html> data-theme. */
export type ThemeId = "ocstudio" | "light";

/** All known theme ids; stored themes outside this list fall back to the manifest. */
export const workbenchThemes: readonly ThemeId[] = ["ocstudio", "light"];

/** Validate a stored or external theme value against the known theme ids. */
export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (workbenchThemes as readonly string[]).includes(value)
  );
}

export interface WorkbenchConfig {
  /** Display name of the application. */
  appName: string;
  /** Layout preset id (see src/workbench/layouts.ts preset registry). */
  layout: WorkbenchLayoutId;
  /** Extra features enabled on top of the preset defaults. */
  with?: FeatureId[];
  /** Preset default features disabled; the result stays coherent. */
  without?: FeatureId[];
  /** Theme id (see src/styles/themes/*.css). Applied to <html> data-theme. */
  theme: ThemeId;
}

export const workbenchConfig: WorkbenchConfig = {
  appName: "Technical Workbench",
  layout: "technical-ribbon",
  theme: "ocstudio",
};
