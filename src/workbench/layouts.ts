import type { LayoutDefinition, LayoutPreset } from "./types";

export interface LayoutRegistry {
  registerLayout(layout: LayoutDefinition): void;
  get(id: string): LayoutDefinition | undefined;
  has(id: string): boolean;
  list(): LayoutDefinition[];
  getActive(): LayoutDefinition | undefined;
  setActive(id: string): void;
}

export function createLayoutRegistry(): LayoutRegistry {
  const layouts = new Map<string, LayoutDefinition>();
  let activeId: string | null = null;

  return {
    registerLayout(layout) {
      if (layouts.has(layout.id)) {
        throw new Error(`Duplicate layout id: "${layout.id}"`);
      }
      layouts.set(layout.id, layout);
      if (activeId === null) {
        activeId = layout.id;
      }
    },
    get: (id) => layouts.get(id),
    has: (id) => layouts.has(id),
    list: () => [...layouts.values()],
    getActive: () => (activeId === null ? undefined : layouts.get(activeId)),
    setActive: (id) => {
      if (!layouts.has(id)) {
        throw new Error(`Unknown layout id: "${id}"`);
      }
      activeId = id;
    },
  };
}

/** Shared registry used by the demo presets. Tests should use createLayoutRegistry(). */
export const globalLayouts = createLayoutRegistry();

export interface PresetRegistry {
  registerPreset(preset: LayoutPreset): void;
  get(id: string): LayoutPreset | undefined;
  has(id: string): boolean;
  list(): LayoutPreset[];
}

export function createPresetRegistry(): PresetRegistry {
  const presets = new Map<string, LayoutPreset>();

  return {
    registerPreset(preset) {
      if (presets.has(preset.id)) {
        throw new Error(`Duplicate layout preset id: "${preset.id}"`);
      }
      presets.set(preset.id, preset);
    },
    get: (id) => presets.get(id),
    has: (id) => presets.has(id),
    list: () => [...presets.values()],
  };
}

/** Shared preset store used by feature presets. Tests should use createPresetRegistry(). */
export const globalPresets = createPresetRegistry();
