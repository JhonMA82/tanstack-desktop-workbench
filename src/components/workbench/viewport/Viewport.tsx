import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MenuItem } from "../../../workbench/menus";
import { useStatus } from "../../../workbench/status";
import type { ViewportCoords } from "../../../workbench/types";
import { MenuOverlay } from "../primitives/ContextMenu";
import { IconButton } from "../primitives/IconButton";
import { type PanZoomState, usePanZoom } from "./usePanZoom";
import { ViewportGrid } from "./ViewportGrid";
import { ViewportOverlays } from "./ViewportOverlays";

interface ViewportProps {
  children?: ReactNode;
  viewLabel?: string;
  styleLabel?: string;
  scaleLabel?: string;
  onCoordsChange?: (coords: ViewportCoords) => void;
  /**
   * Opt-in pan/zoom: wheel zooms toward the cursor, drag pans, and a
   * zoom-controls overlay appears. Defaults to false (legacy behavior).
   */
  interactive?: boolean;
  onTransformChange?: (state: PanZoomState) => void;
  /** Opt-in right-click menu. Default none (legacy: no menu). */
  contextMenu?: MenuItem[];
  onMenuAction?: (label: string) => void;
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
  interactive = false,
  onTransformChange,
  contextMenu,
  onMenuAction,
}: ViewportProps) {
  const { isActive } = useStatus();
  const [pointer, setPointer] = useState({ x: 0, y: 0, inside: false });
  const panZoom = usePanZoom();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const transformRef = useRef(onTransformChange);
  transformRef.current = onTransformChange;
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

  // Report transform after every pan/zoom commit (single sync point, so
  // handlers never report stale state).
  const { x: tx, y: ty, k: tk } = panZoom;
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!contextMenu) {
        return;
      }
      event.preventDefault();
      setMenuAt({ x: event.clientX, y: event.clientY });
    },
    [contextMenu],
  );
  useEffect(() => {
    transformRef.current?.({ x: tx, y: ty, k: tk });
  }, [tx, ty, tk]);

  // Native non-passive wheel listener: React attaches onWheel passively,
  // so preventDefault (no page scroll while zooming) needs this.
  useEffect(() => {
    const node = containerRef.current;
    if (!interactive || !node) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const cursor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      panZoom.zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, cursor);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [interactive, panZoom]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || event.button !== 0) {
        return;
      }
      // Overlay controls (zoom buttons) handle their own pointer events.
      if ((event.target as HTMLElement).closest("[data-viewport-overlay]")) {
        return;
      }
      dragRef.current = { startX: event.clientX, startY: event.clientY };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [interactive],
  );

  const handlePointerMovePan = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!interactive || !drag) {
        return;
      }
      panZoom.panBy(event.movementX, event.movementY);
    },
    [interactive, panZoom],
  );

  const endPan = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Keyboard zoom when the viewport is focused. None of "+"/"-"/"0"
  // collide with registered demo shortcuts (V/L/C/M, Z/P, G/F8/F3,
  // Ctrl+K); stopPropagation keeps the global dispatcher from seeing them.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        event.stopPropagation();
        panZoom.zoomIn();
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        event.stopPropagation();
        panZoom.zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        event.stopPropagation();
        panZoom.reset();
      }
    },
    [interactive, panZoom],
  );

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Drawing viewport. Move the pointer to read coordinates."
      tabIndex={interactive ? 0 : undefined}
      className={`relative min-w-0 flex-1 overflow-hidden bg-[var(--wb-background)] ${interactive ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
      onMouseMove={handleMove}
      onMouseLeave={() => setPointer((prev) => ({ ...prev, inside: false }))}
      onPointerDown={handlePointerDown}
      onPointerMove={interactive ? handlePointerMovePan : undefined}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      {showGrid ? <ViewportGrid /> : null}
      {interactive ? (
        <div
          aria-hidden
          className="absolute inset-0 origin-top-left"
          style={{ transform: panZoom.transform }}
        >
          {children}
        </div>
      ) : (
        children
      )}
      <ViewportOverlays
        pointer={pointer}
        viewLabel={viewLabel}
        styleLabel={styleLabel}
        scaleLabel={scaleLabel}
      />
      {interactive ? (
        <div
          data-viewport-overlay
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm border border-[var(--wb-border)] bg-black/55 px-1 py-0.5"
        >
          <IconButton
            icon={ZoomOut}
            label="Zoom out"
            onClick={() => panZoom.zoomOut()}
          />
          <span
            aria-live="polite"
            className="wb-mono min-w-11 px-1 text-center text-[10px] text-[var(--wb-text)]"
          >
            {Math.round(panZoom.k * 100)}%
          </span>
          <IconButton
            icon={ZoomIn}
            label="Zoom in"
            onClick={() => panZoom.zoomIn()}
          />
          <IconButton
            icon={Maximize}
            label="Reset view"
            onClick={() => panZoom.reset()}
          />
        </div>
      ) : null}
      {menuAt && contextMenu ? (
        <MenuOverlay
          items={contextMenu}
          x={menuAt.x}
          y={menuAt.y}
          onClose={() => setMenuAt(null)}
          onAction={onMenuAction}
        />
      ) : null}
    </div>
  );
}
