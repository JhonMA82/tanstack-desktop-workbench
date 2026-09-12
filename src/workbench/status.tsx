import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { loadWorkspaceState, saveWorkspaceState } from "./persistence";
import type { StatusItemDefinition } from "./types";

const hydratedStatusRegistries = new WeakSet<object>();

/** Apply stored toggles once per registry; unknown ids are ignored. */
function hydrateStatusToggles(registry: StatusRegistry): void {
  if (hydratedStatusRegistries.has(registry)) {
    return;
  }
  hydratedStatusRegistries.add(registry);
  const stored = loadWorkspaceState().statusToggles;
  if (!stored) {
    return;
  }
  for (const [id, active] of Object.entries(stored)) {
    try {
      if (registry.has(id)) {
        registry.setActive(id, active);
      }
    } catch {
      // Ignore entries that no longer resolve to a registered item.
    }
  }
}

/** Persist the full toggle snapshot; user toggles are low-frequency. */
function persistStatusToggles(registry: StatusRegistry): void {
  const snapshot: Record<string, boolean> = {};
  for (const item of registry.list()) {
    try {
      snapshot[item.id] = registry.isActive(item.id);
    } catch {
      // Skip entries that fail to read; never break the toggle path.
    }
  }
  saveWorkspaceState({ statusToggles: snapshot });
}

export interface StatusRegistry {
  registerStatusItem(item: StatusItemDefinition): void;
  get(id: string): StatusItemDefinition | undefined;
  has(id: string): boolean;
  list(): StatusItemDefinition[];
  toggles(): StatusItemDefinition[];
  isActive(id: string): boolean;
  toggle(id: string): void;
  setActive(id: string, active: boolean): void;
  getValue(id: string): string;
  setValue(id: string, value: string): void;
}

export function createStatusRegistry(): StatusRegistry {
  const items = new Map<string, StatusItemDefinition>();
  const active = new Map<string, boolean>();
  const values = new Map<string, string>();

  const ensure = (id: string): StatusItemDefinition => {
    const item = items.get(id);
    if (!item) {
      throw new Error(`Unknown status item id: "${id}"`);
    }
    return item;
  };

  return {
    registerStatusItem(item) {
      if (items.has(item.id)) {
        throw new Error(`Duplicate status item id: "${item.id}"`);
      }
      items.set(item.id, item);
      active.set(item.id, item.active ?? false);
      values.set(item.id, item.value ?? "");
    },
    get: (id) => items.get(id),
    has: (id) => items.has(id),
    list: () => [...items.values()],
    toggles: () => [...items.values()].filter((item) => item.kind === "toggle"),
    isActive: (id) => active.get(id) ?? ensure(id).active ?? false,
    toggle: (id) => {
      const item = ensure(id);
      active.set(id, !(active.get(id) ?? item.active ?? false));
    },
    setActive: (id, next) => {
      ensure(id);
      active.set(id, next);
    },
    getValue: (id) => values.get(id) ?? ensure(id).value ?? "",
    setValue: (id, value) => {
      ensure(id);
      values.set(id, value);
    },
  };
}

/** Shared registry used by the demo presets. Tests should use createStatusRegistry(). */
export const globalStatus = createStatusRegistry();

export interface StatusApi {
  items: StatusItemDefinition[];
  toggles: StatusItemDefinition[];
  isActive(id: string): boolean;
  toggle(id: string): void;
  setActive(id: string, active: boolean): void;
  getValue(id: string): string;
  setValue(id: string, value: string): void;
}

const StatusContext = createContext<StatusApi | null>(null);

export function StatusProvider({
  registry,
  children,
}: {
  registry?: StatusRegistry;
  children: ReactNode;
}) {
  const activeRegistry = useMemo(() => registry ?? globalStatus, [registry]);
  const [, setVersion] = useState(0);

  // Synchronous hydration on init: storage is read before the first
  // render that consumes toggle state.
  useMemo(() => {
    hydrateStatusToggles(activeRegistry);
  }, [activeRegistry]);

  // Plain object (no memo): registry reads are live, and setVersion
  // re-renders the provider so consumers see state changes.
  const value: StatusApi = {
    items: activeRegistry.list(),
    toggles: activeRegistry.toggles(),
    isActive: (id: string) => activeRegistry.isActive(id),
    toggle: (id: string) => {
      activeRegistry.toggle(id);
      persistStatusToggles(activeRegistry);
      setVersion((v) => v + 1);
    },
    setActive: (id: string, next: boolean) => {
      activeRegistry.setActive(id, next);
      persistStatusToggles(activeRegistry);
      setVersion((v) => v + 1);
    },
    getValue: (id: string) => activeRegistry.getValue(id),
    setValue: (id: string, text: string) => {
      activeRegistry.setValue(id, text);
      setVersion((v) => v + 1);
    },
  };

  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

export function useStatus(): StatusApi {
  const api = useContext(StatusContext);
  if (!api) {
    throw new Error("useStatus must be used within a StatusProvider");
  }
  return api;
}
