import type { LucideIcon } from "lucide-react";
import type { RegisteredCommand } from "./types";

/**
 * Declarative context-menu model. Menus are data: command entries resolve
 * their label/shortcut from the shared command registry (the SAME command
 * objects as Ribbon/palette/shortcuts), so a menu never duplicates actions.
 */
export type MenuItem =
  /** Entry fed by a registered command (label/shortcut pulled at resolve). */
  | { command: string }
  /** Inline entry for demo/local behavior (no registry round-trip). */
  | {
      label: string;
      icon?: LucideIcon;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
    }
  /** Visual divider. */
  | { separator: true };

export type ResolvedMenuRow =
  | {
      kind: "item";
      label: string;
      icon?: LucideIcon;
      shortcut?: string;
      danger: boolean;
      disabled: boolean;
      /** Command id when fed by the registry (undefined for inline rows). */
      command?: string;
      onSelect?: () => void;
    }
  | { kind: "separator" };

/** Minimal registry surface needed for menu resolution. */
export interface CommandLookup {
  get(id: string): RegisteredCommand | undefined;
}

function isSeparator(item: MenuItem): item is { separator: true } {
  return "separator" in item && item.separator === true;
}

/**
 * Resolve declarative items into render-ready rows. Command entries pull
 * label/icon/shortcut from the registry; unknown command ids throw
 * fail-fast (consistent with layouts/tools registries) instead of
 * silently dropping the entry.
 */
export function resolveMenuItems(
  items: MenuItem[],
  commands: CommandLookup,
): ResolvedMenuRow[] {
  return items.map((item) => {
    if (isSeparator(item)) {
      return { kind: "separator" } as const;
    }
    if ("command" in item) {
      const registered = commands.get(item.command);
      if (!registered) {
        throw new Error(`Unknown command in menu: "${item.command}"`);
      }
      return {
        kind: "item",
        label: registered.label ?? registered.id,
        shortcut: registered.shortcut,
        danger: false,
        disabled: false,
        command: registered.id,
      } as const;
    }
    return {
      kind: "item",
      label: item.label,
      icon: item.icon,
      shortcut: item.shortcut,
      danger: item.danger ?? false,
      disabled: item.disabled ?? false,
      onSelect: item.onSelect,
    } as const;
  });
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface MenuPosition {
  x: number;
  y: number;
}

/**
 * Clamp a menu rectangle into the viewport so it never overflows the
 * visible area. Pure math, no DOM access. When the menu is larger than
 * the viewport the origin pins to 0.
 */
export function clampMenuPosition(
  x: number,
  y: number,
  menuW: number,
  menuH: number,
  viewport: ViewportSize,
): MenuPosition {
  return {
    x: Math.max(0, Math.min(x, viewport.width - menuW)),
    y: Math.max(0, Math.min(y, viewport.height - menuH)),
  };
}
