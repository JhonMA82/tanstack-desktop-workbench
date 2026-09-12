import { useEffect, useState } from "react";
import type { BadgeTone } from "../../components/workbench/primitives/Badge";

/** DEMO-ONLY data for the monitoring preset. No domain logic lives here. */

export interface DemoSource {
  id: string;
  label: string;
  kind: string;
  tone: BadgeTone;
}

export interface DemoTile {
  id: string;
  sourceId: string;
  label: string;
  unit: string;
  base: number;
  amplitude: number;
  decimals: number;
  warnAbove?: number;
  tone: BadgeTone;
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface DemoAlert {
  id: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  time: string;
}

export interface DemoEvent {
  id: string;
  time: string;
  severity: AlertSeverity;
  source: string;
  message: string;
}

export const DEMO_SOURCES: DemoSource[] = [
  { id: "press-line", label: "Press line", kind: "line", tone: "success" },
  { id: "cnc-cell", label: "CNC cell", kind: "cell", tone: "warning" },
  { id: "hvac", label: "HVAC", kind: "facility", tone: "info" },
];

const ALL_TONE: BadgeTone = "neutral";

export const DEMO_TILES: DemoTile[] = [
  {
    id: "press-temp",
    sourceId: "press-line",
    label: "Press temp",
    unit: "°C",
    base: 182.4,
    amplitude: 3.1,
    decimals: 1,
    warnAbove: 186,
    tone: "success",
  },
  {
    id: "press-rate",
    sourceId: "press-line",
    label: "Press rate",
    unit: "/min",
    base: 42,
    amplitude: 2.5,
    decimals: 0,
    tone: "info",
  },
  {
    id: "spindle-load",
    sourceId: "cnc-cell",
    label: "Spindle load",
    unit: "%",
    base: 68,
    amplitude: 9,
    decimals: 0,
    warnAbove: 75,
    tone: "warning",
  },
  {
    id: "coolant",
    sourceId: "cnc-cell",
    label: "Coolant",
    unit: "°C",
    base: 21.4,
    amplitude: 0.6,
    decimals: 1,
    tone: "success",
  },
  {
    id: "airflow",
    sourceId: "hvac",
    label: "Airflow",
    unit: "m³/h",
    base: 1240,
    amplitude: 60,
    decimals: 0,
    tone: "info",
  },
  {
    id: "filter",
    sourceId: "hvac",
    label: "Filter life",
    unit: "%",
    base: 34,
    amplitude: 0,
    decimals: 0,
    tone: ALL_TONE,
  },
];

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: "alert-1",
    severity: "warning",
    source: "CNC cell",
    message: "Spindle load above 75% for 2 min",
    time: "09:41:07",
  },
  {
    id: "alert-2",
    severity: "info",
    source: "HVAC",
    message: "Filter replacement due this week",
    time: "09:12:53",
  },
];

const EVENT_TEMPLATES: Array<{
  severity: AlertSeverity;
  source: string;
  message: string;
}> = [
  { severity: "info", source: "Press line", message: "Cycle completed" },
  { severity: "info", source: "CNC cell", message: "Tool check passed" },
  { severity: "warning", source: "CNC cell", message: "Spindle load spike" },
  { severity: "info", source: "HVAC", message: "Setpoint reached" },
];

/** Live value for a tile at a tick: slow sine drift around its base. */
export function tileValueAt(tile: DemoTile, tick: number): number {
  const wave = Math.sin(tick / 2 + tile.base);
  return tile.base + wave * tile.amplitude;
}

/** Format a tile value with its decimals (unit rendered separately). */
export function formatTileValue(tile: DemoTile, tick: number): string {
  return tileValueAt(tile, tick).toFixed(tile.decimals);
}

/** Display tone: escalate to warning when the live value crosses warnAbove. */
export function tileToneAt(tile: DemoTile, tick: number): BadgeTone {
  if (
    tile.warnAbove !== undefined &&
    tileValueAt(tile, tick) > tile.warnAbove
  ) {
    return "warning";
  }
  return tile.tone;
}

/** Last N demo values for the sparkline, oldest first. */
export function tileHistory(
  tile: DemoTile,
  tick: number,
  points = 12,
): number[] {
  const history: number[] = [];
  for (let offset = points - 1; offset >= 0; offset -= 1) {
    history.push(tileValueAt(tile, tick - offset));
  }
  return history;
}

/** Overall rollup: worst severity across tiles, "nominal" when all calm. */
export function summarizeTiles(
  tiles: DemoTile[],
  tick: number,
): { state: string; tone: BadgeTone; active: number } {
  let active = 0;
  for (const tile of tiles) {
    if (tileToneAt(tile, tick) === "warning") {
      active += 1;
    }
  }
  if (active > 0) {
    return {
      state: `${active} warning${active === 1 ? "" : "s"}`,
      tone: "warning",
      active,
    };
  }
  return { state: "nominal", tone: "success", active: 0 };
}

/** Deterministic demo event for a tick (capped by the caller). */
export function eventAt(tick: number): DemoEvent {
  const template = EVENT_TEMPLATES[tick % EVENT_TEMPLATES.length];
  const seconds = String(20 + (tick % 40)).padStart(2, "0");
  return {
    id: `event-${tick}`,
    time: `09:42:${seconds}`,
    severity: template.severity,
    source: template.source,
    message: template.message,
  };
}

/** Ticks on an interval with cleanup; paused workbenches stop ticking. */
export function useTick(active: boolean, intervalMs = 1500): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
  return tick;
}
