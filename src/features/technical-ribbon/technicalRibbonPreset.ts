import { globalPresets } from "../../workbench/layouts";
import type { LayoutPreset } from "../../workbench/types";

/**
 * Technical-ribbon preset: ribbon over tool-rail/viewport/inspector with
 * command bar and status bar. Declares composition only; domain content
 * comes from the registered commands, tools, widgets, and status items.
 */
export const technicalRibbonPreset: LayoutPreset = {
  id: "technical-ribbon",
  label: "Technical Ribbon",
  description:
    "Ribbon over ToolRail|Viewport|Inspector with CommandBar/StatusBar.",
  slots: {
    top: ["ribbon"],
    left: ["tool-rail"],
    center: ["viewport"],
    right: ["inspector"],
    bottom: ["command-bar", "status-bar"],
  },
  defaultFeatures: [
    "ribbon",
    "tool-rail",
    "viewport",
    "inspector",
    "command-bar",
    "statusbar",
  ],
};

export function registerTechnicalRibbonPreset(): void {
  if (!globalPresets.has(technicalRibbonPreset.id)) {
    globalPresets.registerPreset(technicalRibbonPreset);
  }
}
