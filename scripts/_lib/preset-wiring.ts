/**
 * Shared preset wiring table: single source of truth for the router
 * component + side-effect preset registration per preset id.
 * Used by scripts/generate-project.ts (prune) and
 * scripts/generate-add-preset.ts (add). Keep in sync by editing here only.
 */

export interface PresetRouterWiring {
  component: string;
  componentFrom: string;
  presetSideEffect: string;
}

export const PRESET_ROUTER_WIRING: Record<string, PresetRouterWiring> = {
  "technical-ribbon": {
    component: "TechnicalRibbonPage",
    componentFrom: "../features/technical-ribbon/TechnicalRibbonPage",
    presetSideEffect: "../features/technical-ribbon/technicalRibbonLayout",
  },
  ide: {
    component: "IdeWorkbench",
    componentFrom: "../features/ide/IdeWorkbench",
    presetSideEffect: "../features/ide/idePreset",
  },
  studio: {
    component: "StudioWorkbench",
    componentFrom: "../features/studio/StudioWorkbench",
    presetSideEffect: "../features/studio/studioPreset",
  },
  operator: {
    component: "OperatorWorkbench",
    componentFrom: "../features/operator/OperatorWorkbench",
    presetSideEffect: "../features/operator/operatorPreset",
  },
  monitoring: {
    component: "MonitoringWorkbench",
    componentFrom: "../features/monitoring/MonitoringWorkbench",
    presetSideEffect: "../features/monitoring/monitoringPreset",
  },
  setup: {
    component: "SetupWorkbench",
    componentFrom: "../features/setup/SetupWorkbench",
    presetSideEffect: "../features/setup/setupPreset",
  },
  minimal: {
    component: "MinimalWorkbench",
    componentFrom: "../features/minimal/MinimalWorkbench",
    presetSideEffect: "../features/minimal/minimalPreset",
  },
  forms: {
    component: "FormsWorkbench",
    componentFrom: "../features/forms/FormsWorkbench",
    presetSideEffect: "../features/forms/formsPreset",
  },
  records: {
    component: "RecordsWorkbench",
    componentFrom: "../features/records/RecordsWorkbench",
    presetSideEffect: "../features/records/recordsPreset",
  },
  settings: {
    component: "SettingsWorkbench",
    componentFrom: "../features/settings/SettingsWorkbench",
    presetSideEffect: "../features/settings/settingsPreset",
  },
};

export const PRESET_FEATURE_DIRS = [
  "technical-ribbon",
  "ide",
  "studio",
  "operator",
  "minimal",
  "monitoring",
  "setup",
] as const;

export const VIEWPORT_FREE_PRESET_DIRS = [
  "forms",
  "records",
  "settings",
] as const;

/** All known preset ids from the wiring table, sorted. */
export const KNOWN_PRESET_IDS: string[] =
  Object.keys(PRESET_ROUTER_WIRING).sort();

/** Load-bearing feature per preset for pruned assertions (viewport default). */
export const PRUNE_LOAD_BEARING: Record<string, string> = {
  forms: "form",
  records: "data-table",
  settings: "form",
};

export function pruneLoadBearing(id: string): string {
  return PRUNE_LOAD_BEARING[id] ?? "viewport";
}
