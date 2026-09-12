/**
 * Canonical shortcut model for the workbench command system.
 *
 * Canonical strings already used across the codebase: single keys ("L", "G"),
 * function keys ("F8", "F3") and combos ("Ctrl+K", "Ctrl+Shift+Z").
 * "Ctrl" and "Cmd" are treated as the same modifier ("mod"), so one
 * registered string works on Windows/Linux and macOS.
 */

export interface ParsedShortcut {
  /** Ctrl on Windows/Linux, Cmd on macOS. */
  mod: boolean;
  shift: boolean;
  alt: boolean;
  /** Uppercase key name: "K", "F8", "ESCAPE", "DELETE", ... */
  key: string;
}

/** Minimal keyboard-event shape needed for matching (DOM + tests). */
export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

function normalizeKeyPart(part: string): string {
  const upper = part.trim().toUpperCase();
  if (upper === "ESC") {
    return "ESCAPE";
  }
  if (upper === "DEL") {
    return "DELETE";
  }
  if (upper === "SPACE" || upper === "SPACEBAR") {
    return " ";
  }
  return upper;
}

function isModPart(part: string): boolean {
  const upper = part.trim().toUpperCase();
  return (
    upper === "CTRL" ||
    upper === "CONTROL" ||
    upper === "CMD" ||
    upper === "COMMAND" ||
    upper === "META" ||
    upper === "MOD" ||
    upper === "WIN"
  );
}

function isShiftPart(part: string): boolean {
  return part.trim().toUpperCase() === "SHIFT";
}

function isAltPart(part: string): boolean {
  const upper = part.trim().toUpperCase();
  return upper === "ALT" || upper === "OPTION";
}

/**
 * Parse a canonical shortcut string. Modifier order is irrelevant:
 * "Ctrl+Shift+Z" and "Shift+Ctrl+Z" parse identically. The key is the
 * last non-modifier segment.
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  let mod = false;
  let shift = false;
  let alt = false;
  let key = "";
  for (const part of parts) {
    if (isModPart(part)) {
      mod = true;
    } else if (isShiftPart(part)) {
      shift = true;
    } else if (isAltPart(part)) {
      alt = true;
    } else {
      key = normalizeKeyPart(part);
    }
  }
  return { mod, shift, alt, key };
}

function normalizeEventKey(key: string): string {
  if (key === " ") {
    return " ";
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return normalizeKeyPart(key);
}

/**
 * True when a keydown event fires the given canonical shortcut.
 * Bare keys ("L", "G", "F8") require NO modifiers; combos require an
 * exact modifier match. Ctrl and Cmd are interchangeable.
 */
export function matchesEvent(event: KeyEventLike, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut);
  if (parsed.key === "") {
    return false;
  }
  const eventMod = Boolean(event.ctrlKey ?? event.metaKey);
  if (eventMod !== parsed.mod) {
    return false;
  }
  if (Boolean(event.shiftKey) !== parsed.shift) {
    return false;
  }
  if (Boolean(event.altKey) !== parsed.alt) {
    return false;
  }
  return normalizeEventKey(event.key) === parsed.key;
}

/** Canonical display form: modifiers in Ctrl/Shift/Alt order, uppercase key. */
export function formatShortcut(shortcut: string): string {
  const parsed = parseShortcut(shortcut);
  const parts: string[] = [];
  if (parsed.mod) {
    parts.push("Ctrl");
  }
  if (parsed.shift) {
    parts.push("Shift");
  }
  if (parsed.alt) {
    parts.push("Alt");
  }
  if (parsed.key !== "") {
    parts.push(parsed.key);
  }
  return parts.join("+");
}

export interface FilterableCommand {
  id: string;
  label?: string;
  shortcut?: string;
}

/**
 * Case-insensitive substring filter over id/label/shortcut.
 * Prefix matches (label first, then id) rank before plain substrings;
 * relative order is otherwise preserved. No dependencies.
 */
export function filterCommands<T extends FilterableCommand>(
  commands: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return [...commands];
  }
  const scored: Array<{ command: T; score: number; index: number }> = [];
  commands.forEach((command, index) => {
    const label = (command.label ?? "").toLowerCase();
    const id = command.id.toLowerCase();
    const shortcut = (command.shortcut ?? "").toLowerCase();
    let score = -1;
    if (label.startsWith(needle) || id.startsWith(needle)) {
      score = 0;
    } else if (
      label.includes(needle) ||
      id.includes(needle) ||
      (shortcut !== "" && shortcut.includes(needle))
    ) {
      score = 1;
    }
    if (score >= 0) {
      scored.push({ command, score, index });
    }
  });
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.map((entry) => entry.command);
}
