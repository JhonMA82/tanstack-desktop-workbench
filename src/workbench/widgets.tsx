import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { loadWorkspaceState, saveWorkspaceState } from "./persistence";
import type { DockPosition, WidgetDefinition } from "./types";

const hydratedWidgetRegistries = new WeakSet<object>();

/** Apply stored visibility once per registry; unknown ids are ignored. */
function hydrateWidgetVisibility(registry: WidgetRegistry): void {
  if (hydratedWidgetRegistries.has(registry)) {
    return;
  }
  hydratedWidgetRegistries.add(registry);
  const stored = loadWorkspaceState().widgetsVisible;
  if (!stored) {
    return;
  }
  for (const [id, visible] of Object.entries(stored)) {
    try {
      if (registry.has(id)) {
        if (visible) {
          registry.show(id);
        } else {
          registry.hide(id);
        }
      }
    } catch {
      // Ignore entries that no longer resolve to a registered widget.
    }
  }
}

/** Persist the full visibility snapshot; user toggles are low-frequency. */
function persistWidgetVisibility(registry: WidgetRegistry): void {
  const snapshot: Record<string, boolean> = {};
  for (const def of registry.list()) {
    try {
      snapshot[def.id] = registry.isVisible(def.id);
    } catch {
      // Skip entries that fail to read; never break the toggle path.
    }
  }
  saveWorkspaceState({ widgetsVisible: snapshot });
}

export interface WidgetRegistry {
  registerWidget(def: WidgetDefinition): void;
  get(id: string): WidgetDefinition | undefined;
  has(id: string): boolean;
  list(): WidgetDefinition[];
  visible(position?: DockPosition): WidgetDefinition[];
  isVisible(id: string): boolean;
  show(id: string): void;
  hide(id: string): void;
  toggle(id: string): void;
}

export function createWidgetRegistry(): WidgetRegistry {
  const widgets = new Map<string, WidgetDefinition>();
  const visibility = new Map<string, boolean>();

  const ensure = (id: string): WidgetDefinition => {
    const def = widgets.get(id);
    if (!def) {
      throw new Error(`Unknown widget id: "${id}"`);
    }
    return def;
  };

  return {
    registerWidget(def) {
      if (widgets.has(def.id)) {
        throw new Error(`Duplicate widget id: "${def.id}"`);
      }
      widgets.set(def.id, def);
      visibility.set(def.id, def.visible ?? true);
    },
    get: (id) => widgets.get(id),
    has: (id) => widgets.has(id),
    list: () => [...widgets.values()],
    visible: (position) =>
      [...widgets.values()].filter(
        (def) =>
          (visibility.get(def.id) ?? true) &&
          (position === undefined || def.defaultPosition === position),
      ),
    isVisible: (id) => visibility.get(id) ?? ensure(id).visible ?? true,
    show: (id) => {
      ensure(id);
      visibility.set(id, true);
    },
    hide: (id) => {
      ensure(id);
      visibility.set(id, false);
    },
    toggle: (id) => {
      const def = ensure(id);
      visibility.set(id, !(visibility.get(id) ?? def.visible ?? true));
    },
  };
}

/** Shared registry used by the demo presets. Tests should use createWidgetRegistry(). */
export const globalWidgets = createWidgetRegistry();

export interface WidgetApi {
  all: WidgetDefinition[];
  visible(position?: DockPosition): WidgetDefinition[];
  isVisible(id: string): boolean;
  show(id: string): void;
  hide(id: string): void;
  toggle(id: string): void;
}

const WidgetContext = createContext<WidgetApi | null>(null);

export function WidgetProvider({
  registry,
  children,
}: {
  registry?: WidgetRegistry;
  children: ReactNode;
}) {
  const activeRegistry = useMemo(() => registry ?? globalWidgets, [registry]);
  const [, setVersion] = useState(0);

  // Synchronous hydration on init: no first-paint flash strategy beyond
  // reading storage before the first render that consumes visibility.
  useMemo(() => {
    hydrateWidgetVisibility(activeRegistry);
  }, [activeRegistry]);

  // Plain object (no memo): registry reads are live, and setVersion
  // re-renders the provider so consumers see visibility changes.
  const value: WidgetApi = {
    all: activeRegistry.list(),
    visible: (position?: DockPosition) => activeRegistry.visible(position),
    isVisible: (id: string) => activeRegistry.isVisible(id),
    show: (id: string) => {
      activeRegistry.show(id);
      persistWidgetVisibility(activeRegistry);
      setVersion((v) => v + 1);
    },
    hide: (id: string) => {
      activeRegistry.hide(id);
      persistWidgetVisibility(activeRegistry);
      setVersion((v) => v + 1);
    },
    toggle: (id: string) => {
      activeRegistry.toggle(id);
      persistWidgetVisibility(activeRegistry);
      setVersion((v) => v + 1);
    },
  };

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
}

export function useWidgets(): WidgetApi {
  const api = useContext(WidgetContext);
  if (!api) {
    throw new Error("useWidgets must be used within a WidgetProvider");
  }
  return api;
}
