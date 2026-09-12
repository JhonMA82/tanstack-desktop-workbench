import { TriangleAlert } from "lucide-react";
import { useState } from "react";

interface Alarm {
  id: string;
  text: string;
  severity: "error" | "warning";
  active: boolean;
}

const initialAlarms: Alarm[] = [
  {
    id: "a1",
    text: "Spindle load above 85%",
    severity: "warning",
    active: true,
  },
  { id: "a2", text: "Coolant level low", severity: "warning", active: true },
  {
    id: "a3",
    text: "Axis limit reached during homing",
    severity: "error",
    active: false,
  },
];

/**
 * Small alarms demo widget for operation presets. Acknowledging is local demo
 * state; a real application wires this to its alarm store.
 */
export function AlarmsWidget() {
  const [alarms, setAlarms] = useState(initialAlarms);
  const activeCount = alarms.filter((alarm) => alarm.active).length;

  return (
    <div
      className="p-1"
      role="log"
      aria-label={`Alarms (${activeCount} active)`}
    >
      {alarms.map((alarm) => (
        <div
          key={alarm.id}
          className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[11px] text-[var(--wb-text)] hover:bg-[var(--wb-surface-hover)]"
        >
          <TriangleAlert
            size={13}
            aria-hidden
            className={`shrink-0 ${
              alarm.severity === "error"
                ? "text-[var(--wb-status-error)]"
                : "text-[var(--wb-status-warning)]"
            }`}
          />
          <span
            className={`flex-1 truncate ${alarm.active ? "" : "text-[var(--wb-text-disabled)] line-through"}`}
          >
            {alarm.text}
          </span>
          {alarm.active ? (
            <button
              type="button"
              onClick={() =>
                setAlarms((prev) =>
                  prev.map((entry) =>
                    entry.id === alarm.id ? { ...entry, active: false } : entry,
                  ),
                )
              }
              className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
            >
              Ack
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
