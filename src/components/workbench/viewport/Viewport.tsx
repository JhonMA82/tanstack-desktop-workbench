import { type ReactNode, useCallback, useState } from "react";
import { useStatus } from "../../../workbench/status";
import type { ViewportCoords } from "../../../workbench/types";
import { ViewportGrid } from "./ViewportGrid";
import { ViewportOverlays } from "./ViewportOverlays";

interface ViewportProps {
  children?: ReactNode;
  viewLabel?: string;
  styleLabel?: string;
  scaleLabel?: string;
  onCoordsChange?: (coords: ViewportCoords) => void;
}

/**
 * Generic viewport container. Hosts any renderer (SVG/Canvas/WebGL) passed as
 * children plus optional grid/overlay chrome. No CAD knowledge.
 */
export function Viewport({
  children,
  viewLabel,
  styleLabel,
  scaleLabel,
  onCoordsChange,
}: ViewportProps) {
  const { isActive } = useStatus();
  const [pointer, setPointer] = useState({ x: 0, y: 0, inside: false });
  // Presets that never register a grid status item still reuse the viewport:
  // an unknown item means "no grid", never a crash.
  let showGrid = false;
  try {
    showGrid = isActive("grid");
  } catch {
    showGrid = false;
  }

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setPointer({ x, y, inside: true });
      onCoordsChange?.({
        x: (x - rect.width / 2) * 0.5,
        y: (rect.height / 2 - y) * 0.5,
        z: 0,
      });
    },
    [onCoordsChange],
  );

  return (
    <div
      role="img"
      aria-label="Drawing viewport. Move the pointer to read coordinates."
      className="relative min-w-0 flex-1 cursor-crosshair overflow-hidden bg-[var(--wb-background)]"
      onMouseMove={handleMove}
      onMouseLeave={() => setPointer((prev) => ({ ...prev, inside: false }))}
    >
      {showGrid ? <ViewportGrid /> : null}
      {children}
      <ViewportOverlays
        pointer={pointer}
        viewLabel={viewLabel}
        styleLabel={styleLabel}
        scaleLabel={scaleLabel}
      />
    </div>
  );
}
