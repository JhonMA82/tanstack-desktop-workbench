import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Monitoring preset: a control-room tile wall with a persistent alert strip.
 * Observe-only: there are no control surfaces here (that is the operator
 * preset's job). The tile wall is the workspace, so both `tile-wall` and
 * the load-bearing `viewport` resolve through the center slot.
 */
export const monitoringPreset: LayoutPreset = {
  id: "monitoring",
  label: "Monitoring",
  description:
    "SystemSummary/AlertStrip over SourceNav|TileWall with EventStream/StatusBar.",
  slots: {
    top: ["system-summary", "alert-strip"],
    left: ["source-nav"],
    center: ["tile-wall", "viewport"],
    right: [],
    bottom: ["event-stream", "status-bar"],
  },
  defaultFeatures: [
    "system-summary",
    "source-nav",
    "tile-wall",
    "viewport",
    "alert-strip",
    "event-stream",
    "statusbar",
  ],
};

export function registerMonitoringPreset(): void {
  if (!globalPresets.has(monitoringPreset.id)) {
    globalPresets.registerPreset(monitoringPreset);
  }
}

registerMonitoringPreset();
