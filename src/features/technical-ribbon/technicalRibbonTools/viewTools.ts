import {
  Box,
  Ghost,
  Grid2x2,
  Hand,
  LayoutGrid,
  Maximize,
  ZoomIn,
} from "lucide-react";
import type { ToolDefinition } from "../../../workbench/types";

/** View-tab tools: navigation, visual styles, and windows. */
export const viewTechnicalRibbonTools: ToolDefinition[] = [
  {
    id: "zoom",
    label: "Zoom",
    icon: ZoomIn,
    tooltip: "Zoom window",
    command: "view.zoom",
    group: "navigate",
    shortcut: "Z",
  },
  {
    id: "pan",
    label: "Pan",
    icon: Hand,
    tooltip: "Pan view",
    command: "view.pan",
    group: "navigate",
    shortcut: "P",
  },
  {
    id: "extents",
    label: "Extents",
    icon: Maximize,
    tooltip: "Zoom to extents",
    command: "view.extents",
    group: "navigate",
  },
  {
    id: "wire2d",
    label: "2D Wire",
    icon: Grid2x2,
    tooltip: "2D wireframe style",
    command: "view.wire2d",
    group: "visual",
  },
  {
    id: "shaded",
    label: "Shaded",
    icon: Box,
    tooltip: "Shaded style",
    command: "view.shaded",
    group: "visual",
  },
  {
    id: "xray",
    label: "X-Ray",
    icon: Ghost,
    tooltip: "X-ray style",
    command: "view.xray",
    group: "visual",
  },
  {
    id: "viewports",
    label: "Viewports",
    icon: LayoutGrid,
    tooltip: "Viewport configuration",
    command: "view.viewports",
    group: "windows",
  },
];
