import { globalTools, type ToolRegistry } from "../../workbench/tools";
import type { ToolDefinition } from "../../workbench/types";
import { annotateTechnicalRibbonTools } from "./technicalRibbonTools/annotateTools";
import { homeTechnicalRibbonTools } from "./technicalRibbonTools/homeTools";
import { manageTechnicalRibbonTools } from "./technicalRibbonTools/manageTools";
import { viewTechnicalRibbonTools } from "./technicalRibbonTools/viewTools";

/** All technical-ribbon preset tools, in ribbon order. Definitions live in ./technicalRibbonTools/*. */
export const TECHNICAL_RIBBON_TOOLS: ToolDefinition[] = [
  ...homeTechnicalRibbonTools,
  ...annotateTechnicalRibbonTools,
  ...viewTechnicalRibbonTools,
  ...manageTechnicalRibbonTools,
];

export function registerTechnicalRibbonTools(
  registry: ToolRegistry = globalTools,
): void {
  for (const tool of TECHNICAL_RIBBON_TOOLS) {
    registry.registerTool(tool);
  }
}

/** Rail order for the technical-ribbon preset. */
export const technicalRibbonRailTools: string[] = [
  "select",
  "line",
  "move",
  "layers",
  "rect",
  "circle",
  "dim",
  "text",
];
