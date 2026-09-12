import { Bell, Briefcase, FolderTree } from "lucide-react";
import { useState } from "react";
import { ActivityBar } from "../../components/workbench/shell/ActivityBar";
import {
  BottomPanel,
  type BottomTab,
} from "../../components/workbench/shell/BottomPanel";
import { DocumentTabs } from "../../components/workbench/shell/DocumentTabs";
import { SlimToolbar } from "../../components/workbench/shell/SlimToolbar";
import { StatusBar } from "../../components/workbench/shell/StatusBar";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { Workspace } from "../../components/workbench/shell/Workspace";
import { PlaceholderCanvas } from "../../components/workbench/viewport/PlaceholderCanvas";
import { Viewport } from "../../components/workbench/viewport/Viewport";
import {
  CommandHistoryWidget,
  ConsoleWidget,
  JobsWidget,
  LayersWidget,
  NotificationsWidget,
  ObjectTreeWidget,
} from "../../components/workbench/widgets/DemoWidgets";
import { PropertiesWidget } from "../../components/workbench/widgets/PropertiesWidget";
import { hasFeature } from "../../workbench/features";
import { StatusProvider } from "../../workbench/status";
import type { FeatureId } from "../../workbench/types";
import { idePreset } from "./idePreset";

const docTabs = ["dashboard.ts", "server.ts", "notes.md"];

const activityViews = [
  { id: "explorer", label: "Explorer", icon: FolderTree },
  { id: "notifications", label: "Notifications", icon: Bell, badge: "2" },
  { id: "jobs", label: "Jobs", icon: Briefcase },
] as const;

function ProblemsTab() {
  const problems = [
    { id: "p1", text: "Unused import in dashboard.ts (line 4)" },
    { id: "p2", text: "Missing return type on loadServer (line 21)" },
  ];
  return (
    <ul className="m-0 list-none p-1.5" aria-label="Problems">
      {problems.map((problem) => (
        <li
          key={problem.id}
          className="wb-mono rounded-sm px-1.5 py-1 text-[11px] text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
        >
          {problem.text}
        </li>
      ))}
    </ul>
  );
}

interface IdeWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * IDE composition: toolbar, activity bar + sidebar, tabbed workspace,
 * optional secondary sidebar, tabbed bottom panel, status bar. Every region
 * is gated on its feature so disabled capabilities collapse the slot.
 */
export function IdeWorkbench({
  features = idePreset.defaultFeatures,
}: IdeWorkbenchProps) {
  const [activityId, setActivityId] = useState<string>("explorer");
  const [docTab, setDocTab] = useState(docTabs[0]);

  const sidebarVisible =
    hasFeature(features, "activity-bar") || hasFeature(features, "explorer");
  const explorerVisible = hasFeature(features, "explorer");
  const secondaryVisible = hasFeature(features, "secondary-sidebar");

  const bottomTabs: BottomTab[] = hasFeature(features, "bottom-panel")
    ? [
        {
          id: "problems",
          title: "Problems",
          content: <ProblemsTab />,
          badge: 2,
        },
        ...(hasFeature(features, "output")
          ? [{ id: "output", title: "Output", content: <ConsoleWidget /> }]
          : []),
        ...(hasFeature(features, "console")
          ? [
              { id: "terminal", title: "Terminal", content: <ConsoleWidget /> },
              {
                id: "logs",
                title: "Logs",
                content: <CommandHistoryWidget />,
              },
            ]
          : []),
      ]
    : [];

  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "toolbar") ? (
          <SlimToolbar title="Workspace">
            <span className="wb-mono truncate text-[11px] text-[var(--wb-text-muted)]">
              Press Ctrl+K for commands
            </span>
          </SlimToolbar>
        ) : null}
        <Workspace>
          {hasFeature(features, "activity-bar") ? (
            <ActivityBar
              items={activityViews.map((view) => ({ ...view }))}
              activeId={activityId}
              onSelect={setActivityId}
            />
          ) : null}
          {sidebarVisible ? (
            <aside
              aria-label="Sidebar"
              className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-[var(--wb-border-subtle)] bg-[var(--wb-surface)]"
            >
              {activityId === "notifications" ? (
                <NotificationsWidget />
              ) : activityId === "jobs" ? (
                <JobsWidget />
              ) : explorerVisible ? (
                <>
                  <ObjectTreeWidget />
                  <LayersWidget />
                </>
              ) : (
                <p className="p-2 text-[11px] text-[var(--wb-text-disabled)]">
                  Explorer is disabled.
                </p>
              )}
            </aside>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            {hasFeature(features, "tabs") ? (
              <DocumentTabs
                tabs={docTabs}
                activeTab={docTab}
                onTabChange={setDocTab}
              />
            ) : null}
            <Viewport>
              <PlaceholderCanvas
                title={docTab}
                subtitle="Editor content renders here"
              />
            </Viewport>
          </div>
          {secondaryVisible ? (
            <aside
              aria-label="Secondary sidebar"
              className="flex w-56 shrink-0 flex-col overflow-y-auto border-l border-[var(--wb-border-subtle)] bg-[var(--wb-surface)]"
            >
              <PropertiesWidget />
            </aside>
          ) : null}
        </Workspace>
        <BottomPanel tabs={bottomTabs} defaultActiveId="problems" />
        {hasFeature(features, "statusbar") ? (
          <StatusBar
            tabs={["main"]}
            activeTab="main"
            onTabChange={() => undefined}
            centerContent={<span>0 errors · 2 warnings · ready</span>}
          />
        ) : null}
      </WorkbenchShell>
    </StatusProvider>
  );
}
