import {
  Badge,
  type BadgeTone,
} from "../../components/workbench/primitives/Badge";
import { WbButton } from "../../components/workbench/primitives/Buttons";
import type { AlertSeverity, DemoAlert } from "./monitoringDemo";

const severityTone: Record<AlertSeverity, BadgeTone> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

interface AlertStripProps {
  alerts: DemoAlert[];
  acknowledged: readonly string[];
  onAcknowledge: (id: string) => void;
}

/**
 * Persistent alert strip. The only action is acknowledge (local state);
 * there are no control buttons — monitoring observes, it does not operate.
 */
export function AlertStrip({
  alerts,
  acknowledged,
  onAcknowledge,
}: AlertStripProps) {
  const active = alerts.filter((alert) => !acknowledged.includes(alert.id));
  return (
    <section
      aria-label="Active alerts"
      className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--wb-border)] bg-[var(--wb-surface)] px-2"
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
        Alerts
      </span>
      {active.length === 0 ? (
        <span className="text-[11px] text-[var(--wb-text-disabled)]">
          All clear
          {acknowledged.length > 0
            ? ` (${acknowledged.length} acknowledged)`
            : ""}
        </span>
      ) : (
        active.map((alert) => (
          <span
            key={alert.id}
            role="alert"
            className="flex shrink-0 items-center gap-1.5 rounded-sm border border-[var(--wb-border-subtle)] px-2 py-0.5 text-[11px]"
          >
            <Badge tone={severityTone[alert.severity]}>{alert.severity}</Badge>
            <span className="font-semibold text-[var(--wb-text)]">
              {alert.source}
            </span>
            <span className="text-[var(--wb-text-muted)]">{alert.message}</span>
            <span className="wb-mono text-[var(--wb-text-disabled)]">
              {alert.time}
            </span>
            <WbButton
              variant="ghost"
              size="small"
              onClick={() => onAcknowledge(alert.id)}
              aria-label={`Acknowledge alert ${alert.id}`}
            >
              Ack
            </WbButton>
          </span>
        ))
      )}
    </section>
  );
}
