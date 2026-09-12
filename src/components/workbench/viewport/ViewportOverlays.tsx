export interface OverlayPointer {
  x: number;
  y: number;
  inside: boolean;
}

interface ViewportOverlaysProps {
  pointer: OverlayPointer;
  viewLabel?: string;
  styleLabel?: string;
  scaleLabel?: string;
}

/** Floating viewport chrome: crosshair, badges, axis gizmo, view cube. */
export function ViewportOverlays({
  pointer,
  viewLabel,
  styleLabel,
  scaleLabel,
}: ViewportOverlaysProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {pointer.inside ? (
        <>
          <div
            className="absolute inset-y-0 w-px bg-white/20"
            style={{ left: pointer.x }}
          />
          <div
            className="absolute inset-x-0 h-px bg-white/20"
            style={{ top: pointer.y }}
          />
        </>
      ) : null}
      <div className="absolute left-2 top-2 flex gap-1.5">
        <span className="rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] text-[var(--wb-text)]">
          {viewLabel ?? "Top"} | {styleLabel ?? "2D Wireframe"}
        </span>
        <span className="rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] text-[var(--wb-text-muted)]">
          {scaleLabel ?? "1:1"}
        </span>
      </div>
      <svg
        className="absolute bottom-2 left-2"
        width="52"
        height="52"
        viewBox="0 0 52 52"
        focusable="false"
        aria-hidden
      >
        <line
          x1="10"
          y1="42"
          x2="42"
          y2="42"
          stroke="var(--wb-axis-x)"
          strokeWidth="1.5"
        />
        <polygon points="42,42 36,39 36,45" fill="var(--wb-axis-x)" />
        <line
          x1="10"
          y1="42"
          x2="10"
          y2="10"
          stroke="var(--wb-axis-y)"
          strokeWidth="1.5"
        />
        <polygon points="10,10 7,16 13,16" fill="var(--wb-axis-y)" />
        <text x="34" y="38" fill="var(--wb-axis-x)" fontSize="10">
          X
        </text>
        <text x="14" y="18" fill="var(--wb-axis-y)" fontSize="10">
          Y
        </text>
      </svg>
      <div className="absolute right-2 top-2 flex h-14 w-14 flex-col items-center rounded-sm border border-[var(--wb-border)] bg-black/55">
        <span className="text-[9px] font-bold text-[var(--wb-text)]">N</span>
        <svg
          width="34"
          height="34"
          viewBox="0 0 34 34"
          focusable="false"
          aria-hidden
        >
          <rect
            x="5"
            y="5"
            width="24"
            height="24"
            fill="none"
            stroke="var(--wb-text-muted)"
            strokeWidth="1.2"
          />
          <rect
            x="11"
            y="11"
            width="12"
            height="12"
            fill="none"
            stroke="var(--wb-accent)"
            strokeWidth="1.2"
          />
        </svg>
      </div>
    </div>
  );
}
