import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Studio preset: workspace selector/toolbar over hierarchy/main/inspector
 * with an adaptable bottom area. The central workspace stays dominant;
 * peripheral panels change with the activity, never the shell.
 */
export const studioPreset: LayoutPreset = {
  id: "studio",
  label: "Studio",
  description:
    "WorkspaceSelector/Toolbar over Hierarchy|Workspace|Inspector with Timeline/BottomPanel.",
  slots: {
    top: ["workspace-selector", "toolbar"],
    left: ["hierarchy", "explorer"],
    center: ["viewport"],
    right: ["inspector"],
    bottom: ["timeline", "bottom-panel", "console", "status-bar"],
  },
  defaultFeatures: [
    "workspace-selector",
    "toolbar",
    "hierarchy",
    "explorer",
    "viewport",
    "inspector",
    "timeline",
    "bottom-panel",
  ],
};

export function registerStudioPreset(): void {
  if (!globalPresets.has(studioPreset.id)) {
    globalPresets.registerPreset(studioPreset);
  }
}

registerStudioPreset();
