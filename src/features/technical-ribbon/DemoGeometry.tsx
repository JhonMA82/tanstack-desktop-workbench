/** Static SVG demo shapes. Lives in the feature layer, not in the Viewport core. */
export function DemoGeometry() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      focusable="false"
    >
      <rect
        x="30%"
        y="28%"
        width="28%"
        height="34%"
        fill="none"
        stroke="var(--wb-accent)"
        strokeWidth="1.5"
        strokeDasharray="7 4"
      />
      <circle
        cx="62%"
        cy="55%"
        r="42"
        fill="none"
        stroke="var(--wb-text-muted)"
        strokeWidth="1.5"
      />
      <line
        x1="18%"
        y1="72%"
        x2="76%"
        y2="24%"
        stroke="var(--wb-text-muted)"
        strokeWidth="1.2"
      />
      <circle cx="30%" cy="28%" r="3" fill="var(--wb-accent)" />
      <circle cx="62%" cy="55%" r="3" fill="var(--wb-text-muted)" />
    </svg>
  );
}
