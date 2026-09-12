import type { FeatureId } from "./types";

/** Versioned key: bump the suffix when the schema changes. */
export const WORKSPACE_STORAGE_KEY = "tanstack-workbench:v1";

/** Current schema version written by saveWorkspaceState. */
export const WORKSPACE_STORAGE_VERSION = 1;

/**
 * Persisted workspace snapshot (schema v1). Every field except version is
 * optional so older or partial payloads merge cleanly over manifest defaults.
 * panelSizes is reserved for future resizable panels: it is read and merged,
 * but nothing writes it yet.
 */
export interface WorkspaceState {
  version: number;
  theme?: string;
  layoutId?: string;
  with?: FeatureId[];
  without?: FeatureId[];
  widgetsVisible?: Record<string, boolean>;
  statusToggles?: Record<string, boolean>;
  panelSizes?: Record<string, number>;
}

/** Manifest-side defaults that stored state overrides. */
export interface WorkspaceDefaults {
  theme: string;
  layoutId: string;
  with: FeatureId[];
  without: FeatureId[];
  widgetsVisible: Record<string, boolean>;
  statusToggles: Record<string, boolean>;
}

/** Minimal storage surface; matches localStorage and test fakes. */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Resolve the backend: injected fake, else localStorage, else null. */
function resolveBackend(backend?: StorageBackend): StorageBackend | null {
  if (backend) {
    return backend;
  }
  try {
    if (typeof globalThis === "undefined") {
      return null;
    }
    const candidate = (globalThis as Record<string, unknown>).localStorage;
    if (
      candidate !== null &&
      typeof candidate === "object" &&
      typeof (candidate as StorageBackend).getItem === "function" &&
      typeof (candidate as StorageBackend).setItem === "function" &&
      typeof (candidate as StorageBackend).removeItem === "function"
    ) {
      return candidate as StorageBackend;
    }
    return null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): FeatureId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  if (value.every((entry) => typeof entry === "string")) {
    return [...value] as FeatureId[];
  }
  return undefined;
}

function asBooleanRecord(value: unknown): Record<string, boolean> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const out: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") {
      out[key] = entry;
    }
  }
  return out;
}

function asNumberRecord(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      out[key] = entry;
    }
  }
  return out;
}

/** Clean one parsed payload; unknown shapes fall back to empty. */
function sanitize(raw: unknown): Partial<WorkspaceState> {
  if (!isRecord(raw)) {
    return {};
  }
  if (raw.version !== WORKSPACE_STORAGE_VERSION) {
    return {};
  }
  const state: Partial<WorkspaceState> = {};
  if (typeof raw.theme === "string" && raw.theme.length > 0) {
    state.theme = raw.theme;
  }
  if (typeof raw.layoutId === "string" && raw.layoutId.length > 0) {
    state.layoutId = raw.layoutId;
  }
  const withIds = asStringArray(raw.with);
  if (withIds) {
    state.with = withIds;
  }
  const withoutIds = asStringArray(raw.without);
  if (withoutIds) {
    state.without = withoutIds;
  }
  const widgets = asBooleanRecord(raw.widgetsVisible);
  if (widgets) {
    state.widgetsVisible = widgets;
  }
  const toggles = asBooleanRecord(raw.statusToggles);
  if (toggles) {
    state.statusToggles = toggles;
  }
  const sizes = asNumberRecord(raw.panelSizes);
  if (sizes) {
    state.panelSizes = sizes;
  }
  return state;
}

/**
 * Merge stored state over manifest defaults. Stored scalars and id lists win
 * when present; visibility records merge per key so new registry entries keep
 * their defaults until the user toggles them.
 */
export function mergeWithDefaults(
  defaults: WorkspaceDefaults,
  stored: Partial<WorkspaceState>,
): WorkspaceDefaults {
  return {
    theme: stored.theme ?? defaults.theme,
    layoutId: stored.layoutId ?? defaults.layoutId,
    with: stored.with ?? defaults.with,
    without: stored.without ?? defaults.without,
    widgetsVisible: { ...defaults.widgetsVisible, ...stored.widgetsVisible },
    statusToggles: { ...defaults.statusToggles, ...stored.statusToggles },
  };
}

/**
 * Load the persisted snapshot. Never throws: missing storage, corrupt JSON,
 * and version mismatches all fall back to an empty partial.
 */
export function loadWorkspaceState(
  backend?: StorageBackend,
): Partial<WorkspaceState> {
  try {
    const storage = resolveBackend(backend);
    if (!storage) {
      return {};
    }
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return sanitize(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

/**
 * Merge a patch into the stored snapshot and write it back. Never throws:
 * storage exceptions (private mode, quota, SSR) are swallowed.
 */
export function saveWorkspaceState(
  patch: Partial<WorkspaceState>,
  backend?: StorageBackend,
): void {
  try {
    const storage = resolveBackend(backend);
    if (!storage) {
      return;
    }
    const current = loadWorkspaceState(storage);
    const next: WorkspaceState = {
      ...current,
      ...patch,
      version: WORKSPACE_STORAGE_VERSION,
    };
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is best-effort; workspace state must never break rendering.
  }
}

/** Remove the persisted snapshot. Never throws. */
export function clearWorkspaceState(backend?: StorageBackend): void {
  try {
    const storage = resolveBackend(backend);
    if (!storage) {
      return;
    }
    storage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore: clearing is best-effort.
  }
}
