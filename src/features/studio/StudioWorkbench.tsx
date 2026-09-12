import { useState } from "react";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import {
  BottomPanel,
  type BottomTab,
} from "../../components/workbench/shell/BottomPanel";
import { DocumentTabs } from "../../components/workbench/shell/DocumentTabs";
import { SlimToolbar } from "../../components/workbench/shell/SlimToolbar";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { Workspace } from "../../components/workbench/shell/Workspace";
import { PlaceholderCanvas } from "../../components/workbench/viewport/PlaceholderCanvas";
import { Viewport } from "../../components/workbench/viewport/Viewport";
import {
  ConsoleWidget,
  LayersWidget,
  ObjectTreeWidget,
} from "../../components/workbench/widgets/DemoWidgets";
import { PropertiesWidget } from "../../components/workbench/widgets/PropertiesWidget";
import { hasFeature } from "../../workbench/features";
import { StatusProvider } from "../../workbench/status";
import type { FeatureId } from "../../workbench/types";
import { studioPreset } from "./studioPreset";

const workspaces = ["Layout", "Configure", "Analyze", "Monitor"];

function TimelineTab() {
  const clips = [
    { id: "t1", label: "Intro", width: "22%" },
    { id: "t2", label: "Process", width: "45%" },
    { id: "t3", label: "Outro", width: "18%" },
  ];
  return (
    <section className="p-2" aria-label="Timeline">
      <div className="wb-mono mb-1 text-[10px] text-[var(--wb-text-disabled)]">
        00:00 ········ 00:30 ········ 01:00
      </div>
      <div className="flex gap-1">
        {clips.map((clip) => (
          <div
            key={clip.id}
            style={{ width: clip.width }}
            className="truncate rounded-sm bg-[var(--wb-surface-hover)] px-2 py-1.5 text-[11px] text-[var(--wb-text)]"
          >
            {clip.label}
          </div>
        ))}
      </div>
    </section>
  );
}

function NodesTab() {
  const nodes = ["Source → Filter → Renderer", "Source → Metrics → Export"];
  return (
    <ul className="m-0 list-none p-1.5" aria-label="Node graph">
      {nodes.map((node) => (
        <li
          key={node}
          className="wb-mono rounded-sm px-1.5 py-1 text-[11px] text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
        >
          {node}
        </li>
      ))}
    </ul>
  );
}

function HierarchyPanel() {
  return (
    <Panel title="Hierarchy" className="min-h-0 flex-1">
      <PanelHeader title="Hierarchy" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ObjectTreeWidget />
      </div>
    </Panel>
  );
}

interface StudioWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Studio composition: workspace selector/toolbar, hierarchy + explorer,
 * dominant central workspace, inspector, adaptable bottom area. Peripheral
 * panels collapse when their features are disabled; the workspace remains.
 */
export function StudioWorkbench({
  features = studioPreset.defaultFeatures,
}: StudioWorkbenchProps) {
  const [workspace, setWorkspace] = useState(workspaces[0]);

  const topVisible =
    hasFeature(features, "toolbar") ||
    hasFeature(features, "workspace-selector");
  const leftVisible =
    hasFeature(features, "hierarchy") || hasFeature(features, "explorer");

  const bottomTabs: BottomTab[] = hasFeature(features, "bottom-panel")
    ? [
        ...(hasFeature(features, "timeline")
          ? [{ id: "timeline", title: "Timeline", content: <TimelineTab /> }]
          : []),
        { id: "nodes", title: "Nodes", content: <NodesTab /> },
        ...(hasFeature(features, "console")
          ? [{ id: "console", title: "Console", content: <ConsoleWidget /> }]
          : []),
      ]
    : [];

  return (
    <StatusProvider>
      <WorkbenchShell>
        {topVisible ? (
          <SlimToolbar title="Studio">
            {hasFeature(features, "workspace-selector") ? (
              <DocumentTabs
                tabs={workspaces}
                activeTab={workspace}
                onTabChange={setWorkspace}
                label="Workspaces"
              />
            ) : undefined}
          </SlimToolbar>
        ) : null}
        <Workspace>
          {leftVisible ? (
            <div className="flex w-60 shrink-0 flex-col gap-px overflow-y-auto bg-[var(--wb-background)]">
              {hasFeature(features, "hierarchy") ? <HierarchyPanel /> : null}
              {hasFeature(features, "explorer") ? (
                <Panel title="Explorer" className="min-h-0 flex-1">
                  <PanelHeader title="Explorer" />
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <LayersWidget />
                  </div>
                </Panel>
              ) : null}
            </div>
          ) : null}
          <Viewport>
            <PlaceholderCanvas
              title={`${workspace} workspace`}
              subtitle="Specialized workspace content renders here"
            />
          </Viewport>
          {hasFeature(features, "inspector") ? (
            <aside
              aria-label="Inspector"
              className="flex w-60 shrink-0 flex-col overflow-y-auto border-l border-[var(--wb-border-subtle)] bg-[var(--wb-surface)]"
            >
              <PropertiesWidget />
            </aside>
          ) : null}
        </Workspace>
        <BottomPanel
          tabs={bottomTabs}
          defaultActiveId={
            hasFeature(features, "timeline") ? "timeline" : "nodes"
          }
          label="Bottom area"
        />
      </WorkbenchShell>
    </StatusProvider>
  );
}
