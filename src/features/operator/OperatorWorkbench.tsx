import { Gauge, LayoutDashboard, Siren, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BottomPanel,
  type BottomTab,
} from "../../components/workbench/shell/BottomPanel";
import {
  SystemStatusHeader,
  type SystemStatusItem,
} from "../../components/workbench/shell/SystemStatusHeader";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { Workspace } from "../../components/workbench/shell/Workspace";
import { Viewport } from "../../components/workbench/viewport/Viewport";
import {
  JobsWidget,
  NotificationsWidget,
} from "../../components/workbench/widgets/DemoWidgets";
import { AlarmsWidget } from "../../components/workbench/widgets/StatusWidgets";
import { hasFeature } from "../../workbench/features";
import { StatusProvider } from "../../workbench/status";
import type { FeatureId } from "../../workbench/types";
import { operatorPreset } from "./operatorPreset";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "process", label: "Process", icon: Gauge },
] as const;

type OperatorView = (typeof navItems)[number]["id"];

function useLiveReadouts(running: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => setTick((value) => value + 1), 1500);
    return () => clearInterval(timer);
  }, [running]);
  const wave = Math.sin(tick / 2);
  return [
    {
      id: "spindle",
      label: "Spindle",
      value: `${(1200 + wave * 18).toFixed(0)} rpm`,
    },
    {
      id: "feed",
      label: "Feed",
      value: `${(450 + wave * 9).toFixed(0)} mm/min`,
    },
    {
      id: "temp",
      label: "Coolant",
      value: `${(21.4 + wave * 0.4).toFixed(1)} °C`,
    },
    { id: "parts", label: "Parts", value: `${128 + tick}` },
  ];
}

function ControlsPanel({
  running,
  onToggleRunning,
}: {
  running: boolean;
  onToggleRunning: () => void;
}) {
  const [feedOverride, setFeedOverride] = useState(100);
  const [coolant, setCoolant] = useState(true);
  return (
    <div className="flex flex-col gap-2 p-2">
      <button
        type="button"
        aria-pressed={running}
        onClick={onToggleRunning}
        className={`rounded-md px-3 py-2 text-[12px] font-bold tracking-wide transition-colors ${
          running
            ? "bg-[var(--wb-status-success)] text-black"
            : "bg-[var(--wb-surface-hover)] text-[var(--wb-text)]"
        }`}
      >
        {running ? "RUNNING" : "STOPPED"}
      </button>
      <div className="rounded-md border border-[var(--wb-border-subtle)] p-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
          Feed override
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease feed override"
            onClick={() => setFeedOverride((value) => Math.max(0, value - 5))}
            className="h-7 w-7 rounded-sm bg-[var(--wb-surface-hover)] text-[var(--wb-text)]"
          >
            −
          </button>
          <span className="wb-mono flex-1 text-center text-[12px] text-[var(--wb-text)]">
            {feedOverride}%
          </span>
          <button
            type="button"
            aria-label="Increase feed override"
            onClick={() => setFeedOverride((value) => Math.min(150, value + 5))}
            className="h-7 w-7 rounded-sm bg-[var(--wb-surface-hover)] text-[var(--wb-text)]"
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-pressed={coolant}
        onClick={() => setCoolant((value) => !value)}
        className="flex items-center justify-between rounded-md border border-[var(--wb-border-subtle)] px-2.5 py-2 text-[11px] text-[var(--wb-text)]"
      >
        Coolant
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${coolant ? "bg-[var(--wb-status-success)]" : "bg-[var(--wb-text-disabled)]"}`}
        />
      </button>
    </div>
  );
}

interface OperatorWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/** Operator composition: status header, navigation, dashboard main view,
 * persistent controls, alarms/diagnostics. No ribbon by default. */
export function OperatorWorkbench({
  features = operatorPreset.defaultFeatures,
}: OperatorWorkbenchProps) {
  const [view, setView] = useState<OperatorView>("dashboard");
  const [running, setRunning] = useState(true);
  const readouts = useLiveReadouts(running);

  const statusItems: SystemStatusItem[] = [
    {
      id: "mode",
      label: "Mode",
      value: running ? "AUTO" : "HELD",
      tone: running ? "ok" : "warning",
    },
    { id: "spindle", label: "Spindle", value: readouts[0].value, tone: "ok" },
    { id: "alarms", label: "Alarms", value: "2 active", tone: "warning" },
  ];

  const bottomTabs: BottomTab[] = hasFeature(features, "alarms")
    ? [
        { id: "alarms", title: "Alarms", content: <AlarmsWidget />, badge: 2 },
        ...(hasFeature(features, "notifications")
          ? [
              {
                id: "events",
                title: "Events",
                content: <NotificationsWidget />,
              },
            ]
          : []),
        { id: "diagnostics", title: "Diagnostics", content: <JobsWidget /> },
      ]
    : [];

  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "system-status") ? (
          <SystemStatusHeader items={statusItems}>
            <Siren
              size={15}
              className="text-[var(--wb-status-warning)]"
              aria-hidden
            />
          </SystemStatusHeader>
        ) : null}
        <Workspace>
          {hasFeature(features, "navigation") ? (
            <nav
              aria-label="Navigation"
              className="flex w-40 shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] p-1.5"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === view;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setView(item.id)}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
                        : "text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
                    }`}
                  >
                    <Icon size={15} aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : null}
          <Viewport
            viewLabel={view === "dashboard" ? "Dashboard" : "Process mimic"}
          >
            <div className="absolute inset-0 grid grid-cols-2 content-center gap-2 p-6">
              {readouts.map((readout) => (
                <div
                  key={readout.id}
                  className="rounded-md border border-[var(--wb-border-subtle)] bg-[var(--wb-surface)]/85 p-2.5 leading-tight"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
                    {readout.label}
                  </p>
                  <p className="wb-mono text-[16px] font-bold text-[var(--wb-text)]">
                    {readout.value}
                  </p>
                </div>
              ))}
            </div>
          </Viewport>
          {hasFeature(features, "controls") ? (
            <aside
              aria-label="Controls"
              className="flex w-52 shrink-0 flex-col overflow-y-auto border-l border-[var(--wb-border-subtle)] bg-[var(--wb-surface)]"
            >
              <p className="flex items-center gap-1.5 border-b border-[var(--wb-border-subtle)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
                <SlidersHorizontal size={12} aria-hidden />
                Controls
              </p>
              <ControlsPanel
                running={running}
                onToggleRunning={() => setRunning((value) => !value)}
              />
            </aside>
          ) : null}
        </Workspace>
        <BottomPanel
          tabs={bottomTabs}
          defaultActiveId="alarms"
          label="Alarms and diagnostics"
        />
      </WorkbenchShell>
    </StatusProvider>
  );
}
