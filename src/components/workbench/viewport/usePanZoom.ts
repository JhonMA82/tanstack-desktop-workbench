import { useCallback, useState } from "react";

export interface PanZoomState {
  x: number;
  y: number;
  /** Scale factor. */
  k: number;
}

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;
const ZOOM_STEP = 1.2;

/** Clamp a scale factor into the supported range. */
export function clampScale(k: number): number {
  if (Number.isNaN(k)) {
    return 1;
  }
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));
}

/**
 * Zoom around a cursor point (viewport pixels relative to the container).
 * The content point under the cursor stays fixed on screen.
 */
export function zoomAt(
  state: PanZoomState,
  cursor: { x: number; y: number },
  factor: number,
): PanZoomState {
  const k = clampScale(state.k * factor);
  if (k === state.k) {
    return state;
  }
  const ratio = k / state.k;
  return {
    k,
    x: cursor.x - (cursor.x - state.x) * ratio,
    y: cursor.y - (cursor.y - state.y) * ratio,
  };
}

/** CSS transform for the panned/zoomed content layer. */
export function toTransform(state: PanZoomState): string {
  return `translate(${state.x}px, ${state.y}px) scale(${state.k})`;
}

export interface PanZoomApi extends PanZoomState {
  transform: string;
  zoomIn: (center?: { x: number; y: number }) => void;
  zoomOut: (center?: { x: number; y: number }) => void;
  zoomBy: (factor: number, center?: { x: number; y: number }) => void;
  panBy: (dx: number, dy: number) => void;
  reset: () => void;
  setState: (state: PanZoomState) => void;
}

const INITIAL: PanZoomState = { x: 0, y: 0, k: 1 };

/** Pan/zoom state with cursor-anchored zoom math. No DOM access. */
export function usePanZoom(initial: PanZoomState = INITIAL): PanZoomApi {
  const [state, setPanZoom] = useState<PanZoomState>({
    x: initial.x,
    y: initial.y,
    k: clampScale(initial.k),
  });

  const zoomBy = useCallback(
    (factor: number, center: { x: number; y: number } = { x: 0, y: 0 }) => {
      setPanZoom((prev) => zoomAt(prev, center, factor));
    },
    [],
  );

  const zoomIn = useCallback(
    (center?: { x: number; y: number }) => {
      zoomBy(ZOOM_STEP, center);
    },
    [zoomBy],
  );
  const zoomOut = useCallback(
    (center?: { x: number; y: number }) => {
      zoomBy(1 / ZOOM_STEP, center);
    },
    [zoomBy],
  );
  const panBy = useCallback((dx: number, dy: number) => {
    setPanZoom((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);
  const reset = useCallback(() => {
    setPanZoom(INITIAL);
  }, []);
  const setState = useCallback((next: PanZoomState) => {
    setPanZoom({ x: next.x, y: next.y, k: clampScale(next.k) });
  }, []);

  return {
    ...state,
    transform: toTransform(state),
    zoomIn,
    zoomOut,
    zoomBy,
    panBy,
    reset,
    setState,
  };
}
