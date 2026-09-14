import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Settings preset: slim toolbar over a centered form with a status bar.
 * Viewport-free: the form is the workspace, so "form" is load-bearing and
 * disabling it is a validation error, never a blank app.
 */
export const settingsPreset: LayoutPreset = {
  id: "settings",
  label: "Settings",
  description: "Slim Toolbar over a centered Form with a StatusBar.",
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

export function registerSettingsPreset(): void {
  if (!globalPresets.has(settingsPreset.id)) {
    globalPresets.registerPreset(settingsPreset);
  }
}

registerSettingsPreset();
