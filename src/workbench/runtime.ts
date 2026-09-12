import {
  type CommandRegistry,
  createCommandRegistry,
  globalCommands,
} from "./commands";
import {
  createFeatureRegistry,
  type FeatureRegistry,
  globalFeatures,
} from "./features";
import {
  createLegacyLayoutAdapter,
  createPresetRegistry,
  globalLayouts,
  globalPresets,
  type LayoutRegistry,
  type PresetRegistry,
} from "./layouts";
import {
  createStatusRegistry,
  globalStatus,
  type StatusRegistry,
} from "./status";
import { createToolRegistry, globalTools, type ToolRegistry } from "./tools";
import {
  createWidgetRegistry,
  globalWidgets,
  type WidgetRegistry,
} from "./widgets";

export interface WorkbenchRuntimeOptions {
  commands?: CommandRegistry;
  widgets?: WidgetRegistry;
  tools?: ToolRegistry;
  status?: StatusRegistry;
  features?: FeatureRegistry;
  presets?: PresetRegistry;
  layouts?: LayoutRegistry;
}

export interface WorkbenchRuntime {
  commands: CommandRegistry;
  widgets: WidgetRegistry;
  tools: ToolRegistry;
  status: StatusRegistry;
  features: FeatureRegistry;
  presets: PresetRegistry;
  /** Legacy view over `presets`; defaults to a thin adapter, no second store. */
  layouts: LayoutRegistry;
}

/**
 * Compose an isolated workbench runtime. Omitted entries default to fresh
 * registries (no shared globals), so tests, HMR, embedding, and multiple
 * workbenches stay side-effect free. No DI frameworks: plain composition.
 */
export function createWorkbenchRuntime(
  options: WorkbenchRuntimeOptions = {},
): WorkbenchRuntime {
  const presets = options.presets ?? createPresetRegistry();
  return {
    commands: options.commands ?? createCommandRegistry(),
    widgets: options.widgets ?? createWidgetRegistry(),
    tools: options.tools ?? createToolRegistry(),
    status: options.status ?? createStatusRegistry(),
    features: options.features ?? createFeatureRegistry(),
    presets,
    layouts: options.layouts ?? createLegacyLayoutAdapter(presets),
  };
}

/**
 * Default runtime wired to the shared globals, for simplicity and backwards
 * compatibility. Prefer `createWorkbenchRuntime()` for isolated use.
 */
export const globalRuntime: WorkbenchRuntime = createWorkbenchRuntime({
  commands: globalCommands,
  widgets: globalWidgets,
  tools: globalTools,
  status: globalStatus,
  features: globalFeatures,
  presets: globalPresets,
  layouts: globalLayouts,
});
