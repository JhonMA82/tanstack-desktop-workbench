import type { ReactNode } from "react";

export type SystemStatusTone = "ok" | "warning" | "error" | "idle";

export interface SystemStatusItem {
  id: string;
  label: string;
  value: string;
  tone: SystemStatusTone;
}

const toneClass: Record<SystemStatusTone, string> = {
  ok: "bg-[var(--wb-status-success)]",
  warning: "bg-[var(--wb-status-warning)]",
  error: "bg-[var(--wb-status-error)]",
  idle: "bg-[var(--wb-text-disabled)]",
};

interface SystemStatusHeaderProps {
  items: SystemStatusItem[];
  /** Trailing controls, e.g. an emergency stop or mode switch. */
  children?: ReactNode;
}

/**
 * Prominent system/machine status header for operation presets. Readouts are
 * plain data owned by the preset; tones use status tokens only.
 */
export function SystemStatusHeader({
  items,
  children,
}: SystemStatusHeaderProps) {
  return (
    <section
      aria-label="System status"
      className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--wb-border)] bg-[var(--wb-surface)] px-3"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
        {items.map((item) => (
          <div key={item.id} className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              title={item.tone}
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneClass[item.tone]}`}
            />
            <div className="leading-tight">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
                {item.label}
              </p>
              <p className="wb-mono text-[12px] font-semibold text-[var(--wb-text)]">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-1.5">{children}</div>
      ) : null}
    </section>
  );
}
