import type { RibbonTab } from "../../workbench/types";

/** Data-driven ribbon model for the technical-ribbon preset. First tool per group renders large. */
export const technicalRibbonTabs: RibbonTab[] = [
  {
    id: "home",
    label: "Home",
    groups: [
      {
        id: "draw",
        label: "Draw",
        tools: ["line", "circle", "rect", "arc", "poly"],
      },
      {
        id: "modify",
        label: "Modify",
        tools: ["move", "copy", "rotate", "mirror", "trim"],
      },
      { id: "layers", label: "Layers", tools: ["layers", "freeze", "lock"] },
      {
        id: "annotation",
        label: "Annotation",
        tools: ["text", "dim", "leader"],
      },
    ],
  },
  {
    id: "annotate",
    label: "Annotate",
    groups: [
      { id: "text", label: "Text", tools: ["mtext", "text", "style"] },
      {
        id: "dimensions",
        label: "Dimensions",
        tools: ["linear", "aligned", "angular", "radius"],
      },
      { id: "leaders", label: "Leaders", tools: ["mleader"] },
    ],
  },
  {
    id: "view",
    label: "View",
    groups: [
      { id: "navigate", label: "Navigate", tools: ["zoom", "pan", "extents"] },
      {
        id: "visual",
        label: "Visual Styles",
        tools: ["wire2d", "shaded", "xray"],
      },
      { id: "windows", label: "Windows", tools: ["viewports"] },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    groups: [
      { id: "custom", label: "Customization", tools: ["cui", "palettes"] },
      { id: "apps", label: "Applications", tools: ["loadApp", "runScript"] },
    ],
  },
];
