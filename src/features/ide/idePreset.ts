import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * IDE preset: command bar over activity bar/sidebar/workspace with a tabbed
 * bottom panel and status bar. Declares composition only; panels reuse the
 * shared widget components.
 */
export const idePreset: LayoutPreset = {
  id: "ide",
  label: "IDE",
  description:
    "ActivityBar|Sidebar|Workspace(+tabs)|SecondarySidebar with BottomPanel/StatusBar.",
  slots: {
    top: ["toolbar", "command-palette"],
    left: ["activity-bar", "explorer"],
    center: ["viewport", "tabs"],
    right: ["secondary-sidebar", "inspector"],
    bottom: [
      "bottom-panel",
      "console",
      "output",
      "notifications",
      "status-bar",
    ],
  },
  defaultFeatures: [
    "toolbar",
    "activity-bar",
    "explorer",
    "viewport",
    "tabs",
    "bottom-panel",
    "console",
    "output",
    "statusbar",
  ],
};

export function registerIdePreset(): void {
  if (!globalPresets.has(idePreset.id)) {
    globalPresets.registerPreset(idePreset);
  }
}

registerIdePreset();
