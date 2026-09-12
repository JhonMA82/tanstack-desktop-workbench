import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearWorkspaceState,
  loadWorkspaceState,
  mergeWithDefaults,
  type StorageBackend,
  saveWorkspaceState,
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORAGE_VERSION,
  type WorkspaceDefaults,
} from "./persistence";

/** In-memory fake standing in for localStorage. */
function createFakeBackend(): StorageBackend & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

const defaults: WorkspaceDefaults = {
  theme: "ocstudio",
  layoutId: "technical-ribbon",
  with: [],
  without: [],
  widgetsVisible: { properties: true, layers: false },
  statusToggles: { grid: true, ortho: false },
};

describe("loadWorkspaceState", () => {
  it("returns empty for missing data", () => {
    expect(loadWorkspaceState(createFakeBackend())).toEqual({});
  });

  it("falls back to empty on corrupt JSON", () => {
    const backend = createFakeBackend();
    backend.store.set(WORKSPACE_STORAGE_KEY, "{not-json");
    expect(loadWorkspaceState(backend)).toEqual({});
  });

  it("falls back to empty on non-object payloads", () => {
    const backend = createFakeBackend();
    backend.store.set(WORKSPACE_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(loadWorkspaceState(backend)).toEqual({});
  });

  it("falls back to empty on version mismatch", () => {
    const backend = createFakeBackend();
    backend.store.set(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: 999, theme: "graphite" }),
    );
    expect(loadWorkspaceState(backend)).toEqual({});
  });

  it("loads a valid snapshot and drops malformed fields", () => {
    const backend = createFakeBackend();
    backend.store.set(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        theme: "graphite",
        layoutId: "ide",
        with: ["explorer"],
        without: ["inspector"],
        widgetsVisible: { layers: true, bogus: "yes" },
        statusToggles: { grid: false },
        panelSizes: { right: 240 },
        theme2: 42,
      }),
    );
    const state = loadWorkspaceState(backend);
    expect(state.theme).toBe("graphite");
    expect(state.layoutId).toBe("ide");
    expect(state.with).toEqual(["explorer"]);
    expect(state.without).toEqual(["inspector"]);
    expect(state.widgetsVisible).toEqual({ layers: true });
    expect(state.statusToggles).toEqual({ grid: false });
    expect(state.panelSizes).toEqual({ right: 240 });
  });

  it("reads the reserved panelSizes slot without requiring writers", () => {
    const backend = createFakeBackend();
    saveWorkspaceState({ panelSizes: { right: 300 } }, backend);
    expect(loadWorkspaceState(backend).panelSizes).toEqual({ right: 300 });
  });
});

describe("mergeWithDefaults", () => {
  it("prefers stored values over manifest defaults", () => {
    const merged = mergeWithDefaults(defaults, {
      theme: "graphite",
      layoutId: "ide",
      with: ["explorer"],
      without: ["inspector"],
    });
    expect(merged.theme).toBe("graphite");
    expect(merged.layoutId).toBe("ide");
    expect(merged.with).toEqual(["explorer"]);
    expect(merged.without).toEqual(["inspector"]);
  });

  it("keeps manifest defaults for absent stored fields", () => {
    expect(mergeWithDefaults(defaults, {})).toEqual(defaults);
  });

  it("merges visibility records per key", () => {
    const merged = mergeWithDefaults(defaults, {
      widgetsVisible: { layers: true, extra: false },
      statusToggles: { grid: false },
    });
    expect(merged.widgetsVisible).toEqual({
      properties: true,
      layers: true,
      extra: false,
    });
    expect(merged.statusToggles).toEqual({ grid: false, ortho: false });
  });

  it("round-trips through save and load", () => {
    const backend = createFakeBackend();
    saveWorkspaceState({ theme: "graphite" }, backend);
    saveWorkspaceState({ layoutId: "studio" }, backend);
    const merged = mergeWithDefaults(defaults, loadWorkspaceState(backend));
    expect(merged.theme).toBe("graphite");
    expect(merged.layoutId).toBe("studio");
    const raw = JSON.parse(
      backend.store.get(WORKSPACE_STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;
    expect(raw.version).toBe(WORKSPACE_STORAGE_VERSION);
  });
});

describe("clearWorkspaceState", () => {
  it("removes the stored snapshot", () => {
    const backend = createFakeBackend();
    saveWorkspaceState({ theme: "graphite" }, backend);
    expect(loadWorkspaceState(backend).theme).toBe("graphite");
    clearWorkspaceState(backend);
    expect(loadWorkspaceState(backend)).toEqual({});
  });
});

describe("storage-exception safety", () => {
  const throwing: StorageBackend = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  };

  it("never propagates throwing-backend errors", () => {
    expect(() => loadWorkspaceState(throwing)).not.toThrow();
    expect(loadWorkspaceState(throwing)).toEqual({});
    expect(() => saveWorkspaceState({ theme: "x" }, throwing)).not.toThrow();
    expect(() => clearWorkspaceState(throwing)).not.toThrow();
  });

  it("works without any backend (SSR-safe)", () => {
    expect(() => loadWorkspaceState()).not.toThrow();
    expect(() => saveWorkspaceState({ theme: "x" })).not.toThrow();
    expect(() => clearWorkspaceState()).not.toThrow();
  });
});

describe("saveWorkspaceState validation", () => {
  let backend: ReturnType<typeof createFakeBackend>;

  beforeEach(() => {
    backend = createFakeBackend();
  });

  it("stamps the current version on write", () => {
    saveWorkspaceState({ theme: "graphite" }, backend);
    const raw = JSON.parse(
      backend.store.get(WORKSPACE_STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;
    expect(raw.version).toBe(WORKSPACE_STORAGE_VERSION);
    expect(raw.theme).toBe("graphite");
  });
});
