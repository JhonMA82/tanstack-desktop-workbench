import type { BadgeTone } from "../../components/workbench/primitives/Badge";

export interface Layer {
  id: string;
  name: string;
  /** Token reference for the color dot (never hardcoded hex). */
  colorVar: string;
  linetype: string;
  visible: boolean;
  locked: boolean;
  frozen: boolean;
}

export interface Job {
  id: string;
  operation: string;
  progress: number;
  status: string;
  tone: BadgeTone;
  duration: string;
}

export const initialLayers: Layer[] = [
  {
    id: "walls",
    name: "Walls",
    colorVar: "var(--wb-axis-x)",
    linetype: "Continuous",
    visible: true,
    locked: false,
    frozen: false,
  },
  {
    id: "dims",
    name: "Dimensions",
    colorVar: "var(--wb-axis-y)",
    linetype: "Dashed",
    visible: true,
    locked: true,
    frozen: false,
  },
  {
    id: "grid",
    name: "Grid",
    colorVar: "var(--wb-text-muted)",
    linetype: "Dotted",
    visible: false,
    locked: false,
    frozen: true,
  },
  {
    id: "paths",
    name: "Toolpaths",
    colorVar: "var(--wb-accent)",
    linetype: "Continuous",
    visible: true,
    locked: false,
    frozen: false,
  },
  {
    id: "notes",
    name: "Annotations",
    colorVar: "var(--wb-status-warning)",
    linetype: "DashDot",
    visible: false,
    locked: false,
    frozen: true,
  },
];

export const demoJobs: Job[] = [
  {
    id: "J-1042",
    operation: "Pocket clearing",
    progress: 82,
    status: "Running",
    tone: "info",
    duration: "04:12",
  },
  {
    id: "J-1041",
    operation: "Contour finish",
    progress: 100,
    status: "Done",
    tone: "success",
    duration: "02:47",
  },
  {
    id: "J-1040",
    operation: "Drill cycle",
    progress: 35,
    status: "Paused",
    tone: "warning",
    duration: "01:05",
  },
  {
    id: "J-1039",
    operation: "Facing pass",
    progress: 0,
    status: "Failed",
    tone: "error",
    duration: "00:00",
  },
  {
    id: "J-1038",
    operation: "Engrave labels",
    progress: 100,
    status: "Done",
    tone: "success",
    duration: "00:58",
  },
];
