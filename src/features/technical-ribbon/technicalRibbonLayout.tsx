import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CommandBar } from "../../components/workbench/shell/CommandBar";
import { Ribbon } from "../../components/workbench/shell/Ribbon";
import { StatusBar } from "../../components/workbench/shell/StatusBar";
import { ToolRail } from "../../components/workbench/shell/ToolRail";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { Workspace } from "../../components/workbench/shell/Workspace";
import { Viewport } from "../../components/workbench/viewport/Viewport";
import { WidgetHost } from "../../components/workbench/widgets/DockPanel";
import { CommandProvider } from "../../workbench/commands";
import { hasFeature } from "../../workbench/features";
import type { MenuItem } from "../../workbench/menus";
import { StatusProvider } from "../../workbench/status";
import { ToolProvider, useTools } from "../../workbench/tools";
import type {
  FeatureId,
  LayoutDefinition,
  ViewportCoords,
} from "../../workbench/types";
import { useWidgets, WidgetProvider } from "../../workbench/widgets";
import { DemoGeometry } from "./DemoGeometry";
import {
  getTechnicalRibbonToolSync,
  registerTechnicalRibbonCommands,
  shouldSyncTechnicalRibbonTool,
} from "./technicalRibbonCommands";
import {
  registerTechnicalRibbonPreset,
  technicalRibbonPreset,
} from "./technicalRibbonPreset";
import { technicalRibbonTabs } from "./technicalRibbonRibbon";
import { registerTechnicalRibbonStatus } from "./technicalRibbonStatus";
import {
  registerTechnicalRibbonTools,
  technicalRibbonRailTools,
} from "./technicalRibbonTools";
import { registerTechnicalRibbonWidgets } from "./technicalRibbonWidgets";

/**
 * Legacy layout view derived from the canonical `technicalRibbonPreset`.
 * The preset is the single source of truth; this object survives only for
 * backwards-compatible `LayoutDefinition` consumers. Rail/widget ids live in
 * the tool/widget registries, not in the preset.
 */
export const technicalRibbonLayout: LayoutDefinition = {
  id: "technical-ribbon",
  name: "Technical Ribbon",
  description:
    "Ribbon over ToolRail|Viewport|Inspector with CommandBar/StatusBar.",
  railTools: technicalRibbonRailTools,
  rightWidgets: ["properties"],
  bottomWidgets: [],
};

// Preset wiring: registries are populated once at import. Apps extend the
// workbench by registering more entries, never by editing the shell.
registerTechnicalRibbonCommands();
registerTechnicalRibbonTools();
registerTechnicalRibbonWidgets();
registerTechnicalRibbonStatus();
registerTechnicalRibbonPreset();

function Inspector() {
  const { visible } = useWidgets();
  const widgets = visible("right");
  return (
    <aside
      aria-label="Inspector"
      className="flex w-[220px] shrink-0 flex-col gap-px overflow-y-auto bg-[var(--wb-background)]"
    >
      {widgets.map((widget) => (
        <WidgetHost key={widget.id} widgetId={widget.id} />
      ))}
    </aside>
  );
}

// Viewport right-click menu: zoom commands, separator, grid toggle.
// Every entry reuses a registered command id (zero duplicated actions).
const viewportContextMenu: MenuItem[] = [
  { command: "view.zoom-in" },
  { command: "view.zoom-out" },
  { command: "view.reset" },
  { separator: true },
  { command: "grid.toggle" },
];

interface TechnicalRibbonWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

function TechnicalRibbonWorkbenchInner({
  features = technicalRibbonPreset.defaultFeatures,
}: TechnicalRibbonWorkbenchProps) {
  const [coords, setCoords] = useState<ViewportCoords>({ x: 0, y: 0, z: 0 });
  const [docTab, setDocTab] = useState("Model");
  const [cleanScreen, setCleanScreen] = useState(false);

  return (
    <WorkbenchShell>
      {cleanScreen || !hasFeature(features, "ribbon") ? null : (
        <Ribbon tabs={technicalRibbonTabs} />
      )}
      <Workspace>
        {hasFeature(features, "tool-rail") ? (
          <ToolRail tools={technicalRibbonRailTools} />
        ) : null}
        <Viewport
          onCoordsChange={setCoords}
          scaleLabel="1:1"
          contextMenu={viewportContextMenu}
        >
          <DemoGeometry />
        </Viewport>
        {hasFeature(features, "inspector") ? <Inspector /> : null}
      </Workspace>
      {hasFeature(features, "command-bar") ? <CommandBar /> : null}
      {hasFeature(features, "statusbar") ? (
        <StatusBar
          tabs={["Model", "Layout1", "Layout2"]}
          activeTab={docTab}
          onTabChange={setDocTab}
          scale="1:1"
          cleanScreenActive={cleanScreen}
          onCleanScreen={() => setCleanScreen((value) => !value)}
          centerContent={
            <>
              <span>
                {coords.x.toFixed(3)}, {coords.y.toFixed(3)},{" "}
                {coords.z.toFixed(3)}
              </span>
              <span className="text-white/60">WCS</span>
            </>
          }
        />
      ) : null}
    </WorkbenchShell>
  );
}

export function TechnicalRibbonToolSync(): null {
  const { activeToolId, selectTool } = useTools();
  const { subscribe, getSnapshot } = useMemo(
    () => getTechnicalRibbonToolSync(),
    [],
  );
  const selectedToolId = useSyncExternalStore(subscribe, getSnapshot);
  // Effect-only sync (never setState during render): no-op when the
  // selection coincides with the core active tool or when there is none.
  // The guard also breaks the selectTool -> command -> selection loop.
  useEffect(() => {
    if (shouldSyncTechnicalRibbonTool(selectedToolId, activeToolId)) {
      selectTool(selectedToolId as string);
    }
  }, [selectedToolId, activeToolId, selectTool]);
  return null;
}

export function TechnicalRibbonWorkbench(props: TechnicalRibbonWorkbenchProps) {
  return (
    <CommandProvider>
      <ToolProvider initialTool="select">
        <TechnicalRibbonToolSync />
        <WidgetProvider>
          <StatusProvider>
            <TechnicalRibbonWorkbenchInner {...props} />
          </StatusProvider>
        </WidgetProvider>
      </ToolProvider>
    </CommandProvider>
  );
}
