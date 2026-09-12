import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Setup preset: a linear step-driven wizard (step rail + step content +
 * Back/Next footer). Spatially distinct from the docked-panel presets: no
 * ribbon, inspector, tile wall, or explorer. The center viewport hosts the
 * current step body; the rail and footer are wizard chrome, not panels.
 */
export const setupPreset: LayoutPreset = {
  id: "setup",
  label: "Setup",
  description: "Toolbar over StepRail|StepContent with WizardNav/StatusBar.",
  slots: {
    top: ["toolbar"],
    left: ["step-rail"],
    center: ["viewport"],
    right: [],
    bottom: ["wizard-nav", "status-bar"],
  },
  defaultFeatures: [
    "toolbar",
    "step-rail",
    "viewport",
    "wizard-nav",
    "statusbar",
  ],
};

export function registerSetupPreset(): void {
  if (!globalPresets.has(setupPreset.id)) {
    globalPresets.registerPreset(setupPreset);
  }
}

registerSetupPreset();
