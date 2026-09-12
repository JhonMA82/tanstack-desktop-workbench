import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Minimal preset: slim toolbar, plain workspace, status bar. Deliberately
 * small; the fallback when explorer/inspector/ribbon/bottom panel add no
 * value. Disabling the viewport is a validation error, never a blank app.
 */
export const minimalPreset: LayoutPreset = {
  id: "minimal",
  label: "Minimal",
  description: "Slim Toolbar over a plain Workspace with a StatusBar.",
  slots: {
    top: ["toolbar"],
    left: [],
    center: ["viewport"],
    right: [],
    bottom: ["status-bar"],
  },
  defaultFeatures: ["toolbar", "viewport", "statusbar"],
};

export function registerMinimalPreset(): void {
  if (!globalPresets.has(minimalPreset.id)) {
    globalPresets.registerPreset(minimalPreset);
  }
}

registerMinimalPreset();
