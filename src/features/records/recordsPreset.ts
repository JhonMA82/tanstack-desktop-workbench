import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Records preset: toolbar over navigation/data-table/detail with a status bar.
 * Viewport-free: the data table is the workspace, so "data-table" is
 * load-bearing and disabling it is a validation error, never a blank app.
 */
export const recordsPreset: LayoutPreset = {
  id: "records",
  label: "Records",
  description: "Toolbar over Navigation|DataTable|Detail with StatusBar.",
  slots: {
    top: ["toolbar"],
    left: ["navigation"],
    center: ["data-table"],
    right: ["detail"],
    bottom: ["status-bar"],
  },
  defaultFeatures: [
    "toolbar",
    "navigation",
    "data-table",
    "detail",
    "statusbar",
  ],
  loadBearing: ["data-table"],
};

export function registerRecordsPreset(): void {
  if (!globalPresets.has(recordsPreset.id)) {
    globalPresets.registerPreset(recordsPreset);
  }
}

registerRecordsPreset();
