import {
  Bell,
  Briefcase,
  ChevronRight,
  CircleDot,
  Eye,
  EyeOff,
  FolderTree,
  Gauge,
  History,
  Lock,
  Snowflake,
  Terminal,
} from "lucide-react";
import { PropertyRow } from "../primitives/PropertyRow";

/* Compact demo widgets proving the registry. Static content, no domain logic. */

const rowClass =
  "flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[11px] text-[var(--wb-text)] hover:bg-[var(--wb-surface-hover)]";

export function LayersWidget() {
  const layers = [
    { name: "0 - Default", icon: Eye, state: "visible" },
    { name: "Walls", icon: Eye, state: "visible" },
    { name: "Dimensions", icon: EyeOff, state: "hidden" },
    { name: "Furniture", icon: Snowflake, state: "frozen" },
    { name: "Electrical", icon: Lock, state: "locked" },
  ];
  return (
    <div className="p-1">
      {layers.map((layer) => (
        <div
          key={layer.name}
          className={rowClass}
          title={`${layer.name} (${layer.state})`}
        >
          <layer.icon
            size={13}
            className="shrink-0 text-[var(--wb-text-muted)]"
            aria-hidden
          />
          <span className="wb-mono truncate">{layer.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ObjectTreeWidget() {
  return (
    <ul className="m-0 list-none p-1" aria-label="Model objects">
      <li className={rowClass}>
        <FolderTree
          size={13}
          className="shrink-0 text-[var(--wb-text-muted)]"
          aria-hidden
        />
        <span>Drawing1</span>
      </li>
      {["Walls", "Doors", "Windows"].map((name) => (
        <li key={name} className={`${rowClass} pl-6`}>
          <ChevronRight
            size={12}
            className="shrink-0 text-[var(--wb-text-disabled)]"
            aria-hidden
          />
          <CircleDot
            size={12}
            className="shrink-0 text-[var(--wb-accent-hover)]"
            aria-hidden
          />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  );
}

export function ConsoleWidget() {
  const lines = [
    { id: "cmd", text: "Command: LINE" },
    { id: "p1", text: "Specify first point: 120,-80" },
    { id: "p2", text: "Specify next point: 40,20" },
    { id: "blank", text: "" },
  ];
  return (
    <div
      className="wb-mono p-1.5 text-[11px] leading-relaxed"
      role="log"
      aria-label="Console"
    >
      {lines.map((line) => (
        <p
          key={line.id}
          className="whitespace-pre-wrap text-[var(--wb-text-muted)]"
        >
          <Terminal size={11} className="mr-1 inline" aria-hidden />
          {line.text || " "}
        </p>
      ))}
    </div>
  );
}

export function CommandHistoryWidget() {
  const entries = [
    "LINE 120,-80 → 40,20",
    "CIRCLE r=25",
    "MOVE Δ(10,5)",
    "ZOOM Extents",
  ];
  return (
    <div className="p-1">
      {entries.map((entry) => (
        <div key={entry} className={rowClass}>
          <History
            size={12}
            className="shrink-0 text-[var(--wb-text-muted)]"
            aria-hidden
          />
          <span className="wb-mono truncate">{entry}</span>
        </div>
      ))}
    </div>
  );
}

export function NavigatorWidget() {
  return (
    <div className="p-2">
      <div className="relative h-28 rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)]">
        <div
          aria-hidden
          className="absolute left-1/4 top-1/4 h-1/2 w-1/2 rounded-[2px] border border-[var(--wb-status-error)]"
        />
        <span className="wb-mono absolute bottom-1 right-1 text-[9px] text-[var(--wb-text-disabled)]">
          12%
        </span>
      </div>
    </div>
  );
}

export function MeasurementsWidget() {
  return (
    <div className="px-2 py-1">
      <PropertyRow label="Distance" mono>
        189.73
      </PropertyRow>
      <PropertyRow label="Angle" mono>
        38°
      </PropertyRow>
      <PropertyRow label="Area" mono>
        12,450 mm²
      </PropertyRow>
      <PropertyRow label="Units">Millimeters</PropertyRow>
    </div>
  );
}

export function JobsWidget() {
  const jobs = [
    { name: "Plot - Layout1", progress: 65 },
    { name: "Export PDF", progress: 100 },
  ];
  return (
    <div className="p-1.5">
      {jobs.map((job) => (
        <div key={job.name} className="mb-1.5">
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px]">
            <Briefcase
              size={12}
              className="shrink-0 text-[var(--wb-text-muted)]"
              aria-hidden
            />
            <span className="flex-1 truncate">{job.name}</span>
            <span className="wb-mono text-[var(--wb-text-muted)]">
              {job.progress}%
            </span>
          </div>
          <div
            className="h-1 overflow-hidden rounded-full bg-[var(--wb-background)]"
            role="progressbar"
            aria-valuenow={job.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={job.name}
          >
            <div
              className="h-full bg-[var(--wb-accent)]"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsWidget() {
  const notes = [
    { icon: Bell, text: "Plot job finished: Layout1" },
    { icon: Gauge, text: "GRID snap set to 20px" },
  ];
  return (
    <div className="p-1">
      {notes.map((note) => (
        <div key={note.text} className={rowClass}>
          <note.icon
            size={13}
            className="shrink-0 text-[var(--wb-accent-hover)]"
            aria-hidden
          />
          <span className="truncate">{note.text}</span>
        </div>
      ))}
    </div>
  );
}
