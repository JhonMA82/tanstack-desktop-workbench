import {
  CircleDot,
  GitFork,
  MoveDiagonal,
  MoveHorizontal,
  Palette,
  TextCursorInput,
  Triangle,
} from "lucide-react";
import type { ToolDefinition } from "../../../workbench/types";

/** Annotate-tab tools: text styles, dimensions, and leaders. */
export const annotateTechnicalRibbonTools: ToolDefinition[] = [
  {
    id: "mtext",
    label: "MText",
    icon: TextCursorInput,
    tooltip: "Multiline text",
    command: "annotate.mtext",
    group: "text",
  },
  {
    id: "style",
    label: "Style",
    icon: Palette,
    tooltip: "Text style",
    command: "annotate.style",
    group: "text",
  },
  {
    id: "linear",
    label: "Linear",
    icon: MoveHorizontal,
    tooltip: "Linear dimension",
    command: "annotate.linear",
    group: "dimensions",
  },
  {
    id: "aligned",
    label: "Aligned",
    icon: MoveDiagonal,
    tooltip: "Aligned dimension",
    command: "annotate.aligned",
    group: "dimensions",
  },
  {
    id: "angular",
    label: "Angular",
    icon: Triangle,
    tooltip: "Angular dimension",
    command: "annotate.angular",
    group: "dimensions",
  },
  {
    id: "radius",
    label: "Radius",
    icon: CircleDot,
    tooltip: "Radius dimension",
    command: "annotate.radius",
    group: "dimensions",
  },
  {
    id: "mleader",
    label: "Multileader",
    icon: GitFork,
    tooltip: "Multileader",
    command: "annotate.mleader",
    group: "leaders",
  },
];
