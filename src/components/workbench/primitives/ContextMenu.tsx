import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCommands } from "../../../workbench/commands";
import {
  clampMenuPosition,
  type MenuItem,
  type ResolvedMenuRow,
  resolveMenuItems,
} from "../../../workbench/menus";
import { formatShortcut } from "../../../workbench/shortcuts";

interface MenuOverlayProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  /** Fired with the row label after any successful activation (readouts). */
  onAction?: (label: string) => void;
}

function selectableIndexes(rows: ResolvedMenuRow[]): number[] {
  const indexes: number[] = [];
  rows.forEach((row, index) => {
    if (row.kind === "item" && !row.disabled) {
      indexes.push(index);
    }
  });
  return indexes;
}

/**
 * Cursor-anchored menu overlay. Portal + clamped position + Esc/outside/
 * scroll/resize dismissal mirror the Dialog primitive; arrow-key nav
 * mirrors the CommandPalette. Flat list + separators only (no submenus).
 */
export function MenuOverlay({
  items,
  x,
  y,
  onClose,
  onAction,
}: MenuOverlayProps) {
  const commands = useCommands();
  // Fail-fast: unknown command ids throw here, never render a silent gap.
  const rows = useMemo(
    () => resolveMenuItems(items, commands),
    [items, commands],
  );
  // Stable keys: command id/label for items, ordinal for separators.
  const keyed = useMemo(() => {
    let separators = 0;
    return rows.map((row) => ({
      row,
      key:
        row.kind === "separator"
          ? `separator-${separators++}`
          : (row.command ?? row.label),
    }));
  }, [rows]);
  const enabled = useMemo(() => selectableIndexes(rows), [rows]);
  const [activeRow, setActiveRow] = useState<number>(enabled[0] ?? -1);
  const [position, setPosition] = useState({ x, y });
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Clamp after measuring: the pure util stays testable, the DOM read
  // stays in this layout effect.
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    setPosition(
      clampMenuPosition(x, y, rect.width, rect.height, {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    );
  }, [x, y]);

  useLayoutEffect(() => {
    menuRef.current?.focus();
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const close = () => closeRef.current();
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      previouslyFocused?.focus?.();
    };
  }, []);

  const activate = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (row?.kind !== "item" || row.disabled) {
      return;
    }
    if (row.command) {
      commands.execute(row.command);
    } else {
      row.onSelect?.();
    }
    onAction?.(row.label);
    closeRef.current();
  };

  const move = (direction: 1 | -1) => {
    if (enabled.length === 0) {
      return;
    }
    const at = enabled.indexOf(activeRow);
    const next =
      at === -1
        ? enabled[direction === 1 ? 0 : enabled.length - 1]
        : enabled[(at + direction + enabled.length) % enabled.length];
    setActiveRow(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (enabled.length > 0) {
        setActiveRow(enabled[0]);
      }
    } else if (event.key === "End") {
      event.preventDefault();
      if (enabled.length > 0) {
        setActiveRow(enabled[enabled.length - 1]);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      activate(activeRow);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeRef.current();
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 min-w-44 rounded-md border border-[var(--wb-border)] bg-[var(--wb-surface)] p-1 shadow-xl focus:outline-none"
    >
      <div className="flex flex-col gap-px">
        {keyed.map(({ row, key }, index) => {
          if (row.kind === "separator") {
            return (
              <hr
                key={key}
                className="mx-1 my-1 border-0 border-t border-[var(--wb-border-subtle)]"
              />
            );
          }
          const active = index === activeRow;
          return (
            <button
              key={key}
              type="button"
              role="menuitem"
              aria-disabled={row.disabled || undefined}
              disabled={row.disabled}
              onClick={() => activate(index)}
              onMouseEnter={() => {
                if (!row.disabled) {
                  setActiveRow(index);
                }
              }}
              ref={(el) => {
                if (active) {
                  el?.scrollIntoView({ block: "nearest" });
                }
              }}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] focus-visible:outline-2 focus-visible:outline-[var(--wb-accent)] disabled:cursor-default ${
                row.danger
                  ? "text-[var(--wb-status-error)]"
                  : "text-[var(--wb-text)]"
              } ${active && !row.disabled ? "bg-[var(--wb-surface-hover)]" : ""} ${row.disabled ? "text-[var(--wb-text-disabled)]" : ""}`}
            >
              {row.icon ? (
                <row.icon
                  size={13}
                  aria-hidden
                  className="shrink-0 opacity-80"
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate font-medium">
                {row.label}
              </span>
              {row.shortcut ? (
                <kbd className="wb-mono shrink-0 rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] px-1.5 py-0.5 text-[10px] text-[var(--wb-text-muted)]">
                  {formatShortcut(row.shortcut)}
                </kbd>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
