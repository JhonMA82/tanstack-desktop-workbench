import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { type ComponentType, useEffect, useState } from "react";
import { ErrorBoundary } from "../components/workbench/primitives/ErrorBoundary";
import { IdeWorkbench } from "../features/ide/IdeWorkbench";
import { ControlsShowcase } from "../features/showcase/ControlsShowcase";
import { TechnicalRibbonPage } from "../features/technical-ribbon/TechnicalRibbonPage";
import "../features/ide/idePreset";
import { MinimalWorkbench } from "../features/minimal/MinimalWorkbench";
import "../features/minimal/minimalPreset";
import { MonitoringWorkbench } from "../features/monitoring/MonitoringWorkbench";
import "../features/monitoring/monitoringPreset";
import { OperatorWorkbench } from "../features/operator/OperatorWorkbench";
import "../features/operator/operatorPreset";
import { SetupWorkbench } from "../features/setup/SetupWorkbench";
import "../features/setup/setupPreset";
import { StudioWorkbench } from "../features/studio/StudioWorkbench";
import "../features/studio/studioPreset";
import "../features/technical-ribbon/technicalRibbonLayout";
import { resolveFeaturesOrThrow } from "../workbench/features";
import { globalPresets } from "../workbench/layouts";
import {
  loadWorkspaceState,
  saveWorkspaceState,
} from "../workbench/persistence";
import type { FeatureId } from "../workbench/types";
import {
  isThemeId,
  type ThemeId,
  workbenchConfig,
  workbenchThemes,
} from "./workbench.config";

type PresetComponent = ComponentType<{ features?: FeatureId[] }>;

/**
 * Preset id -> composition. The manifest layout and every preview route
 * resolve through this table, so adding a preset means adding one entry.
 */
const presetComponents: Record<string, PresetComponent> = {
  "technical-ribbon": TechnicalRibbonPage,
  ide: IdeWorkbench,
  studio: StudioWorkbench,
  operator: OperatorWorkbench,
  monitoring: MonitoringWorkbench,
  setup: SetupWorkbench,
  minimal: MinimalWorkbench,
};

const previewPresets = [
  "technical-ribbon",
  "ide",
  "studio",
  "operator",
  "monitoring",
  "setup",
  "minimal",
];

/** Fullscreen frame shared by the code-based preview routes. */
function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen w-screen min-h-0 flex-col overflow-hidden bg-[var(--wb-background)] supports-[height:100dvh]:h-[100dvh]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </main>
  );
}

/**
 * DEMO-ONLY theme switcher: toggles the applied theme at runtime.
 * Not part of the shell; it reuses the theme write-back path.
 */
function ThemeSwitcher({
  theme,
  onThemeChange,
}: {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}) {
  return (
    <span className="ml-2 flex items-center gap-1 border-l border-[var(--wb-border-subtle)] pl-2">
      <span className="mr-1 font-semibold uppercase tracking-wider text-[var(--wb-text-disabled)]">
        Theme
      </span>
      {workbenchThemes.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={theme === id}
          onClick={() => onThemeChange(id)}
          className={
            theme === id
              ? "rounded-sm bg-[var(--wb-surface-hover)] px-2 py-0.5 text-[var(--wb-text)]"
              : "rounded-sm px-2 py-0.5 text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
          }
        >
          {id}
        </button>
      ))}
    </span>
  );
}

/**
 * DEMO-ONLY preset switcher: plain links for comparing presets. Not part of
 * the shell; generated applications delete it and render one preset.
 */
function PresetSwitcher({
  theme,
  onThemeChange,
}: {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}) {
  return (
    <nav
      aria-label="Preset preview"
      className="flex h-8 shrink-0 items-center gap-1 border-b border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] px-2 text-[11px]"
    >
      <span className="mr-1 font-semibold uppercase tracking-wider text-[var(--wb-text-disabled)]">
        Preview
      </span>
      <Link
        to="/"
        className="rounded-sm px-2 py-0.5 text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
        activeProps={{
          className:
            "rounded-sm px-2 py-0.5 bg-[var(--wb-surface-hover)] text-[var(--wb-text)]",
        }}
      >
        Manifest
      </Link>
      {previewPresets.map((id) => (
        <Link
          key={id}
          to="/presets/$presetId"
          params={{ presetId: id }}
          className="rounded-sm px-2 py-0.5 text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
          activeProps={{
            className:
              "rounded-sm px-2 py-0.5 bg-[var(--wb-surface-hover)] text-[var(--wb-text)]",
          }}
        >
          {id}
        </Link>
      ))}
      <Link
        to="/demo/controls"
        className="rounded-sm px-2 py-0.5 text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
        activeProps={{
          className:
            "rounded-sm px-2 py-0.5 bg-[var(--wb-surface-hover)] text-[var(--wb-text)]",
        }}
      >
        Controls
      </Link>
      <ThemeSwitcher theme={theme} onThemeChange={onThemeChange} />
    </nav>
  );
}

/**
 * Resolve the initial theme: stored wins when it names a known theme,
 * else the manifest default with a warning (same pattern as layout).
 */
function resolveInitialTheme(): ThemeId {
  const stored = loadWorkspaceState().theme;
  if (stored === undefined) {
    return workbenchConfig.theme;
  }
  if (isThemeId(stored)) {
    return stored;
  }
  console.warn(
    `Ignoring stored theme "${stored}": unknown theme. Falling back to manifest theme "${workbenchConfig.theme}".`,
  );
  return workbenchConfig.theme;
}

function RootLayout() {
  // Stored theme wins over the manifest default (sync init, no flash handling).
  const [theme, setTheme] = useState(resolveInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Write the applied theme through so a stored value stays authoritative.
    saveWorkspaceState({ theme });
  }, [theme]);
  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <PresetSwitcher theme={theme} onThemeChange={setTheme} />
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </ErrorBoundary>
  );
}

/**
 * Resolve a preset id to its component with stored with/without
 * overrides layered over the manifest. Stored combos still validate
 * fail-fast: a corrupt stored combo falls back to the manifest with a
 * console warning, never a broken screen.
 */
function PresetView({ presetId }: { presetId: string }) {
  const preset = globalPresets.get(presetId);
  if (!preset) {
    throw new Error(
      `Unknown layout preset: "${presetId}". Registered presets: ${
        globalPresets
          .list()
          .map((entry) => entry.id)
          .join(", ") || "none"
      }.`,
    );
  }
  const Component = presetComponents[presetId];
  if (!Component) {
    throw new Error(
      `Preset "${presetId}" has no preview component. Register one in presetComponents.`,
    );
  }
  // Synchronous storage read per render: route renders are low-frequency.
  const stored = loadWorkspaceState();
  let features: FeatureId[];
  try {
    // Incoherent with/without combinations fail fast with a readable error.
    features = resolveFeaturesOrThrow(preset, {
      with: stored.with ?? workbenchConfig.with,
      without: stored.without ?? workbenchConfig.without,
    });
  } catch (error) {
    console.warn(
      `Ignoring stored feature overrides for preset "${preset.id}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    features = resolveFeaturesOrThrow(preset, workbenchConfig);
  }
  return (
    <PreviewFrame>
      <Component features={features} />
    </PreviewFrame>
  );
}

/**
 * Main route: renders the stored active layout when it resolves to a
 * registered preset, else the manifest layout. Unknown stored ids fall
 * back to the manifest with a warning, never a broken screen.
 */
function IndexPage() {
  const storedLayoutId = loadWorkspaceState().layoutId;
  let presetId: string = workbenchConfig.layout;
  if (storedLayoutId !== undefined) {
    if (globalPresets.has(storedLayoutId)) {
      presetId = storedLayoutId;
    } else {
      console.warn(
        `Ignoring stored layout "${storedLayoutId}": unknown preset. Falling back to manifest layout "${workbenchConfig.layout}".`,
      );
    }
  }
  return <PresetView presetId={presetId} />;
}

function PresetPreviewPage() {
  const { presetId } = presetPreviewRoute.useParams();
  useEffect(() => {
    // The previewed preset becomes the active layout (direct write:
    // route visits are low-frequency user actions).
    if (globalPresets.has(presetId)) {
      saveWorkspaceState({ layoutId: presetId });
    }
  }, [presetId]);
  return <PresetView presetId={presetId} />;
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

const presetPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/presets/$presetId",
  component: PresetPreviewPage,
});

const demoControlsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/demo/controls",
  component: ControlsShowcase,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  presetPreviewRoute,
  demoControlsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
