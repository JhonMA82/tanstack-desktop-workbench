import type {
  FeatureId,
  LayoutDefinition,
  LayoutPreset,
  LayoutSlotId,
} from "./types";

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

/**
 * Best-effort migration from the legacy `LayoutDefinition` model to the
 * canonical `LayoutPreset` model. Rail tools imply a `tool-rail` slot,
 * right widgets imply an `inspector` slot, bottom widgets imply a
 * `bottom-panel` slot; the center is always the `viewport` workspace.
 * Tool/widget ids themselves live in their own registries, not in the
 * preset: only hosting capabilities are migrated.
 */
export function migrateLegacyLayoutToPreset(
  layout: LayoutDefinition,
): LayoutPreset {
  const left: string[] =
    layout.railTools && layout.railTools.length > 0 ? ["tool-rail"] : [];
  const right: string[] =
    layout.rightWidgets && layout.rightWidgets.length > 0 ? ["inspector"] : [];
  const bottom: string[] =
    layout.bottomWidgets && layout.bottomWidgets.length > 0
      ? ["bottom-panel"]
      : [];
  const slots: Record<LayoutSlotId, string[]> = {
    top: [],
    left,
    center: ["viewport"],
    right,
    bottom,
  };
  const defaultFeatures = [
    "viewport",
    ...left,
    ...right,
    ...bottom,
  ] as FeatureId[];
  return {
    id: layout.id,
    label: layout.name,
    description: layout.description,
    slots,
    defaultFeatures,
  };
}

/**
 * Thin legacy adapter over a canonical preset registry. There is a single
 * source of truth (presets); layout reads synthesize a `LayoutDefinition`
 * view from the preset, and legacy registrations are migrated into presets
 * via `migrateLegacyLayoutToPreset`. No double registration: registering a
 * layout whose id already exists as a preset throws.
 */
export function createLegacyLayoutAdapter(
  presets: PresetRegistry,
): LayoutRegistry {
  let activeId: string | null = null;
  const toView = (preset: LayoutPreset): LayoutDefinition => ({
    id: preset.id,
    name: preset.label,
    description: preset.description,
  });
  return {
    registerLayout(layout) {
      if (presets.has(layout.id)) {
        throw new Error(`Duplicate layout id: "${layout.id}"`);
      }
      presets.registerPreset(migrateLegacyLayoutToPreset(layout));
      if (activeId === null) {
        activeId = layout.id;
      }
    },
    get: (id) => {
      const preset = presets.get(id);
      return preset ? toView(preset) : undefined;
    },
    has: (id) => presets.has(id),
    list: () => presets.list().map(toView),
    getActive: () => {
      if (activeId !== null) {
        const preset = presets.get(activeId);
        if (preset) {
          return toView(preset);
        }
      }
      const first = presets.list()[0];
      return first ? toView(first) : undefined;
    },
    setActive: (id) => {
      if (!presets.has(id)) {
        throw new Error(`Unknown layout id: "${id}"`);
      }
      activeId = id;
    },
  };
}

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

/**
 * Shared layout registry: a thin adapter over `globalPresets`, the single
 * canonical preset store. Tests should use `createPresetRegistry()` +
 * `createLegacyLayoutAdapter()` (or `createLayoutRegistry()` for isolated
 * legacy behavior).
 */
export const globalLayouts: LayoutRegistry =
  createLegacyLayoutAdapter(globalPresets);
