import { useMemo, useState } from "react";
import { WbButton } from "../../components/workbench/primitives/Buttons";
import { SystemStatusHeader } from "../../components/workbench/shell/SystemStatusHeader";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { Workspace } from "../../components/workbench/shell/Workspace";
import { hasFeature } from "../../workbench/features";
import { StatusProvider } from "../../workbench/status";
import type { FeatureId } from "../../workbench/types";
import { AlertStrip } from "./AlertStrip";
import { EventStream } from "./EventStream";
import {
  DEMO_ALERTS,
  DEMO_SOURCES,
  DEMO_TILES,
  eventAt,
  summarizeTiles,
  useTick,
} from "./monitoringDemo";
import { monitoringPreset } from "./monitoringPreset";
import { TileWall } from "./TileWall";

interface MonitoringWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Monitoring composition: system summary, persistent alert strip, source
 * nav, dominant tile wall, event stream, read-only status line.
 * Observe-only: the only button is alert acknowledge (local state).
 * Source selection filters the wall; it issues no commands.
 */
export function MonitoringWorkbench({
  features = monitoringPreset.defaultFeatures,
}: MonitoringWorkbenchProps) {
  const tick = useTick(true);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const summary = summarizeTiles(DEMO_TILES, tick);
  const events = useMemo(() => {
    const rows = [];
    for (let offset = 0; offset < 24; offset += 1) {
      rows.push(eventAt(Math.max(tick - offset, 0)));
    }
    return rows;
  }, [tick]);

  const showNav = hasFeature(features, "source-nav");
  const showWall = hasFeature(features, "tile-wall");
  const showEvents = hasFeature(features, "event-stream");

  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "system-summary") ? (
          <SystemStatusHeader
            items={[
              {
                id: "overall",
                label: "Overall",
                value: summary.state,
                tone: summary.tone === "success" ? "ok" : "warning",
              },
              {
                id: "sources",
                label: "Sources",
                value: `${DEMO_SOURCES.length} watched`,
                tone: "idle",
              },
              {
                id: "alerts",
                label: "Alerts",
                value: `${DEMO_ALERTS.length - acknowledged.length} active`,
                tone:
                  DEMO_ALERTS.length - acknowledged.length > 0
                    ? "warning"
                    : "ok",
              },
            ]}
          />
        ) : null}
        {hasFeature(features, "alert-strip") ? (
          <AlertStrip
            alerts={DEMO_ALERTS}
            acknowledged={acknowledged}
            onAcknowledge={(id) =>
              setAcknowledged((known) =>
                known.includes(id) ? known : [...known, id],
              )
            }
          />
        ) : null}
        <Workspace>
          {showNav ? (
            <nav
              aria-label="Sources"
              className="flex w-40 shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] p-1.5"
            >
              <WbButton
                variant={sourceId === null ? "primary" : "ghost"}
                size="small"
                aria-pressed={sourceId === null}
                onClick={() => setSourceId(null)}
                className="w-full justify-start"
              >
                All sources
              </WbButton>
              {DEMO_SOURCES.map((source) => {
                const active = source.id === sourceId;
                return (
                  <WbButton
                    key={source.id}
                    variant={active ? "primary" : "ghost"}
                    size="small"
                    aria-pressed={active}
                    onClick={() => setSourceId(active ? null : source.id)}
                    className="w-full justify-start"
                  >
                    {source.label}
                  </WbButton>
                );
              })}
            </nav>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {showWall ? (
              <section
                aria-label="Tile wall"
                className="flex min-h-0 flex-1 flex-col"
              >
                <TileWall
                  tiles={DEMO_TILES}
                  tick={tick}
                  sourceId={showNav ? sourceId : null}
                />
              </section>
            ) : null}
            {showEvents ? (
              <section
                aria-label="Event stream"
                className="flex max-h-48 min-h-0 shrink-0 flex-col border-t border-[var(--wb-border-subtle)]"
              >
                <EventStream events={events} />
              </section>
            ) : null}
          </div>
        </Workspace>
        {hasFeature(features, "statusbar") ? (
          <footer className="wb-mono flex h-7 shrink-0 items-center gap-3 bg-[var(--wb-accent)] px-2 text-[10px] font-semibold text-white">
            <span>{summary.state}</span>
            <span className="text-white/70">
              {events.length} events · tick {tick}
            </span>
          </footer>
        ) : null}
      </WorkbenchShell>
    </StatusProvider>
  );
}
