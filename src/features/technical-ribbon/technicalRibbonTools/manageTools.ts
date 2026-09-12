import { PanelLeft, Play, Plug, Settings2 } from "lucide-react";
import type { ToolDefinition } from "../../../workbench/types";

/** Manage-tab tools: customization and applications. */
export const manageTechnicalRibbonTools: ToolDefinition[] = [
  {
    id: "cui",
    label: "CUI",
    icon: Settings2,
    tooltip: "Customize user interface",
    command: "app.cui",
    group: "custom",
  },
  {
    id: "palettes",
    label: "Palettes",
    icon: PanelLeft,
    tooltip: "Tool palettes",
    command: "app.palettes",
    group: "custom",
  },
  {
    id: "loadApp",
    label: "Load App",
    icon: Plug,
    tooltip: "Load application",
    command: "app.load",
    group: "apps",
  },
  {
    id: "runScript",
    label: "Script",
    icon: Play,
    tooltip: "Run script",
    command: "app.script",
    group: "apps",
  },
];
