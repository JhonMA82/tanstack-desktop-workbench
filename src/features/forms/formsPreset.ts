import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Forms preset: toolbar over navigation/form/inspector with a status bar.
 * Viewport-free: the form is the workspace, so "form" is load-bearing and
 * disabling it is a validation error, never a blank app.
 */
export const formsPreset: LayoutPreset = {
  id: "forms",
  label: "Forms",
  description: "Toolbar over Navigation|Form|Inspector with StatusBar.",
  slots: {
    top: ["toolbar"],
    left: ["navigation"],
    center: ["form"],
    right: ["inspector"],
    bottom: ["status-bar"],
  },
  defaultFeatures: ["toolbar", "navigation", "form", "inspector", "statusbar"],
  loadBearing: ["form"],
};

export function registerFormsPreset(): void {
  if (!globalPresets.has(formsPreset.id)) {
    globalPresets.registerPreset(formsPreset);
  }
}

registerFormsPreset();
