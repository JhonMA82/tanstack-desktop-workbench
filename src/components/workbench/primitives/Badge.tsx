export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

const toneVar: Record<BadgeTone, string> = {
  success: "var(--wb-status-success)",
  warning: "var(--wb-status-warning)",
  error: "var(--wb-status-error)",
  info: "var(--wb-accent)",
  neutral: "var(--wb-text-muted)",
};

/** Compact status pill. Tint comes from status tokens, never hardcoded hex. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: string;
}) {
  const color = toneVar[tone];
  return (
    <span
      className="wb-mono inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-px text-[10px] font-semibold leading-tight"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {children}
    </span>
  );
}
