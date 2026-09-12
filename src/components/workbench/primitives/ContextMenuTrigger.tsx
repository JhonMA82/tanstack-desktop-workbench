import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { MenuItem } from "../../../workbench/menus";
import { MenuOverlay } from "./ContextMenu";

interface ContextMenuTriggerProps {
  menu: MenuItem[];
  children: ReactNode;
  onAction?: (label: string) => void;
}

/** Wrap any area to open a declarative menu on right-click. */
export function ContextMenuTrigger({
  menu,
  children,
  onAction,
}: ContextMenuTriggerProps) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // Native listener: the wrapper is a plain positioning box, so the
  // handler stays off the JSX static element.
  useLayoutEffect(() => {
    const node = areaRef.current;
    if (!node) {
      return;
    }
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setAt({ x: event.clientX, y: event.clientY });
    };
    node.addEventListener("contextmenu", onContextMenu);
    return () => node.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return (
    <>
      <div ref={areaRef}>{children}</div>
      {at ? (
        <MenuOverlay
          items={menu}
          x={at.x}
          y={at.y}
          onClose={() => setAt(null)}
          onAction={onAction}
        />
      ) : null}
    </>
  );
}
