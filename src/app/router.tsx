import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { type ComponentType, useEffect } from "react";
import { IdeWorkbench } from "../features/ide/IdeWorkbench";
import { TechnicalRibbonPage } from "../features/technical-ribbon/TechnicalRibbonPage";
import "../features/ide/idePreset";
import { MinimalWorkbench } from "../features/minimal/MinimalWorkbench";
import "../features/minimal/minimalPreset";
import { OperatorWorkbench } from "../features/operator/OperatorWorkbench";
import "../features/operator/operatorPreset";
import { StudioWorkbench } from "../features/studio/StudioWorkbench";
import "../features/studio/studioPreset";
import "../features/technical-ribbon/technicalRibbonLayout";
import { resolveFeaturesOrThrow } from "../workbench/features";
import { globalPresets } from "../workbench/layouts";
import type { FeatureId } from "../workbench/types";
import { workbenchConfig } from "./workbench.config";

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
  minimal: MinimalWorkbench,
};

const previewPresets = [
  "technical-ribbon",
  "ide",
  "studio",
  "operator",
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
 * DEMO-ONLY preset switcher: plain links for comparing presets. Not part of
 * the shell; generated applications delete it and render one preset.
 */
function PresetSwitcher() {
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
    </nav>
  );
}

function RootLayout() {
  useEffect(() => {
    document.documentElement.dataset.theme = workbenchConfig.theme;
  }, []);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <PresetSwitcher />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}

/** Resolve a preset id to its component with default features. */
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
  // Incoherent with/without combinations fail fast with a readable error.
  const features = resolveFeaturesOrThrow(preset, workbenchConfig);
  return (
    <PreviewFrame>
      <Component features={features} />
    </PreviewFrame>
  );
}

/** Main route: renders the manifest's layout with resolved features. */
function IndexPage() {
  return <PresetView presetId={workbenchConfig.layout} />;
}

function PresetPreviewPage() {
  const { presetId } = presetPreviewRoute.useParams();
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

const routeTree = rootRoute.addChildren([indexRoute, presetPreviewRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
