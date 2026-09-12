interface PlaceholderCanvasProps {
  /** Caption naming the workspace content, e.g. a file or view name. */
  title: string;
  /** One-line hint about what a real renderer would show here. */
  subtitle?: string;
}

/**
 * Neutral workspace placeholder: abstract demo geometry with a caption. Used
 * by presets whose real renderer is application content; replace with any
 * SVG/Canvas/WebGL child of Viewport.
 */
export function PlaceholderCanvas({ title, subtitle }: PlaceholderCanvasProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <svg
          width="220"
          height="140"
          viewBox="0 0 220 140"
          role="presentation"
          className="mx-auto opacity-60"
        >
          <rect
            x="30"
            y="25"
            width="90"
            height="70"
            fill="none"
            stroke="var(--wb-border)"
            strokeWidth="1.5"
          />
          <circle
            cx="150"
            cy="60"
            r="28"
            fill="none"
            stroke="var(--wb-accent)"
            strokeWidth="1.5"
          />
          <line
            x1="30"
            y1="115"
            x2="190"
            y2="115"
            stroke="var(--wb-text-disabled)"
            strokeWidth="1"
            strokeDasharray="5 4"
          />
          <line
            x1="150"
            y1="20"
            x2="150"
            y2="100"
            stroke="var(--wb-text-disabled)"
            strokeWidth="1"
            strokeDasharray="5 4"
          />
        </svg>
        <p className="mt-1 text-[12px] font-semibold text-[var(--wb-text)]">
          {title}
        </p>
        {subtitle ? (
          <p className="text-[11px] text-[var(--wb-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
