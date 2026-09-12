import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/** Dock slot a widget can live in. */
export type DockPosition = "left" | "right" | "bottom" | "floating" | "hidden";

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  component: ComponentType;
  defaultPosition: DockPosition;
  defaultSize?: WidgetSize;
  minSize?: WidgetSize;
  closable?: boolean;
  resizable?: boolean;
  /** Initial visibility. Defaults to true. */
  visible?: boolean;
}

export interface CommandOptions {
  label?: string;
  shortcut?: string;
}

export type CommandHandler = (args?: unknown) => void | Promise<void>;

export interface RegisteredCommand {
  id: string;
  execute: CommandHandler;
  label?: string;
  shortcut?: string;
}

export interface ToolDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  tooltip?: string;
  /** Id of the command executed when the tool is selected. */
  command: string;
  group?: string;
  shortcut?: string;
}

export interface RibbonGroup {
  id: string;
  label: string;
  /** Tool ids in render order. The first tool renders large. */
  tools: string[];
}

export interface RibbonTab {
  id: string;
  label: string;
  groups: RibbonGroup[];
}

export type StatusItemKind = "toggle" | "readout";

export interface StatusItemDefinition {
  id: string;
  label: string;
  kind: StatusItemKind;
  /** Initial state for toggles. Defaults to false. */
  active?: boolean;
  /** Initial text for readouts. */
  value?: string;
  shortcut?: string;
}

/**
 * @deprecated Legacy layout model. `LayoutPreset` is the canonical model for
 * describing workbench composition; `LayoutDefinition` survives only as a
 * derived view for backwards compatibility. Migrate with
 * `migrateLegacyLayoutToPreset` (see `src/workbench/layouts.ts`) instead of
 * registering new layouts.
 */
export interface LayoutDefinition {
  id: string;
  name: string;
  description?: string;
  /** Tool ids rendered in the tool rail, in order. */
  railTools?: string[];
  /** Widget ids docked on the right, in order. */
  rightWidgets?: string[];
  /** Widget ids docked at the bottom, in order. */
  bottomWidgets?: string[];
}

/** Capability included in an application: what the app can do/show. */
export type FeatureId =
  | "ribbon"
  | "tool-rail"
  | "viewport"
  | "inspector"
  | "command-bar"
  | "statusbar"
  | "explorer"
  | "console"
  | "output"
  | "bottom-panel"
  | "activity-bar"
  | "tabs"
  | "toolbar"
  | "notifications"
  | "command-palette"
  | "secondary-sidebar"
  | "navigation"
  | "controls"
  | "alarms"
  | "system-status"
  | "hierarchy"
  | "timeline"
  | "workspace-selector"
  | "tile-wall"
  | "alert-strip"
  | "event-stream"
  | "system-summary"
  | "source-nav"
  | "step-rail"
  | "wizard-nav";

/** Visual slot of a layout preset: where capabilities are composed. */
export type LayoutSlotId = "top" | "left" | "center" | "right" | "bottom";

/**
 * Declarative layout preset: how an application is organized visually.
 * Presets declare composition (which capability ids live in each slot plus
 * default features); they never implement domain logic.
 */
export interface LayoutPreset {
  id: string;
  label: string;
  description?: string;
  /** Capability ids hosted in each visual slot. */
  slots: Record<LayoutSlotId, string[]>;
  /** Features enabled by default; adjustable via with/without overrides. */
  defaultFeatures: FeatureId[];
}

/** Drawing-unit coordinates reported by the viewport. */
export interface ViewportCoords {
  x: number;
  y: number;
  z: number;
}
