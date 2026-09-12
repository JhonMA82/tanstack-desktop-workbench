import type { FeatureId } from "../workbench/types";

/**
 * Application manifest: declarative generation metadata for the workbench.
 * There is no CLI generator in this architecture; cloning the repo and
 * editing this file IS the generator.
 *
 * Phase A knows one preset: "technical-ribbon". Phase B will add
 * ide/studio/operator/minimal; the with/without model already anticipates them.
 */
export type WorkbenchLayoutId =
  | "technical-ribbon"
  | "ide"
  | "studio"
  | "operator"
  | "minimal";

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
  theme: string;
}

export const workbenchConfig: WorkbenchConfig = {
  appName: "Technical Workbench",
  layout: "technical-ribbon",
  theme: "ocstudio",
};
