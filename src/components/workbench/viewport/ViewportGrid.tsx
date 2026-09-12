/** Tiled minor/major grid with translucent center axes. Pure SVG, no app logic. */
export function ViewportGrid() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      focusable="false"
    >
      <defs>
        <pattern
          id="wb-grid-minor"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="var(--wb-grid-minor)"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="wb-grid-major"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke="var(--wb-grid-major)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wb-grid-minor)" />
      <rect width="100%" height="100%" fill="url(#wb-grid-major)" />
      <line
        x1="0"
        y1="50%"
        x2="100%"
        y2="50%"
        stroke="var(--wb-axis-x)"
        strokeWidth="1"
        strokeOpacity="0.55"
      />
      <line
        x1="50%"
        y1="0"
        x2="50%"
        y2="100%"
        stroke="var(--wb-axis-y)"
        strokeWidth="1"
        strokeOpacity="0.55"
      />
    </svg>
  );
}
