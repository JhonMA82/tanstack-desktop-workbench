import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Operator preset: prominent system status over navigation/main/controls
 * with alarms always one glance away. No ribbon by default: critical actions
 * stay visible as persistent controls instead of nested menus.
 */
export const operatorPreset: LayoutPreset = {
  id: "operator",
  label: "Operator",
  description:
    "SystemStatus over Navigation|MainView|Controls with Alarms/Events/Diagnostics.",
  slots: {
    top: ["system-status"],
    left: ["navigation"],
    center: ["viewport"],
    right: ["controls"],
    bottom: ["alarms", "notifications", "output", "status-bar"],
  },
  defaultFeatures: [
    "system-status",
    "navigation",
    "viewport",
    "controls",
    "alarms",
    "notifications",
    "statusbar",
  ],
};

export function registerOperatorPreset(): void {
  if (!globalPresets.has(operatorPreset.id)) {
    globalPresets.registerPreset(operatorPreset);
  }
}

registerOperatorPreset();
