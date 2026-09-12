import type { BadgeTone } from "../primitives/Badge";

const toneVar: Record<BadgeTone, string> = {
  success: "var(--wb-status-success)",
  warning: "var(--wb-status-warning)",
  error: "var(--wb-status-error)",
  info: "var(--wb-accent)",
  neutral: "var(--wb-text-muted)",
};

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  tone?: BadgeTone;
  /** Optional trailing sparkline values (oldest first). */
  sparkline?: number[];
}

/** Normalize values to a 48x16 polyline; flat lines render centered. */
export function sparklinePoints(values: number[]): string {
  if (values.length === 0) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 48;
      const y = 14 - ((value - min) / span) * 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Generic status tile: label, mono value, tone dot, optional SVG sparkline.
 * No domain knowledge; any observe-style preset can reuse it.
 */
export function StatTile({
  label,
  value,
  unit,
  tone = "neutral",
  sparkline,
}: StatTileProps) {
  const color = toneVar[tone];
  return (
    <div className="flex min-h-0 flex-col gap-1 rounded-md border border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] p-2.5 leading-tight">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </p>
      <p className="wb-mono text-[18px] font-bold text-[var(--wb-text)]">
        {value}
        {unit ? (
          <span className="ml-1 text-[11px] font-semibold text-[var(--wb-text-muted)]">
            {unit}
          </span>
        ) : null}
      </p>
      {sparkline && sparkline.length > 1 ? (
        <svg
          aria-hidden
          viewBox="0 0 48 16"
          className="h-4 w-full"
          preserveAspectRatio="none"
        >
          <polyline
            points={sparklinePoints(sparkline)}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
        </svg>
      ) : null}
    </div>
  );
}
