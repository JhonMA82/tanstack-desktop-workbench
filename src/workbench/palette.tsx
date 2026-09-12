import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCommands } from "./commands";
import { matchesEvent } from "./shortcuts";

/** Command that toggles the palette; registered idempotently by the provider. */
export const PALETTE_TOGGLE_COMMAND = "command-palette.toggle";
export const PALETTE_TOGGLE_SHORTCUT = "Ctrl+K";

interface PaletteApi {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

const PaletteContext = createContext<PaletteApi | null>(null);

/**
 * Owns palette open state and registers `command-palette.toggle`
 * (Ctrl/Cmd+K) into the command registry, so the palette is part of
 * the command system it demonstrates. Restores focus on close.
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const commands = useCommands();
  const [open, setOpen] = useState(false);
  const lastFocused = useRef<Element | null>(null);

  const openPalette = useCallback(() => {
    if (document.activeElement instanceof Element) {
      lastFocused.current = document.activeElement;
    }
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    const target = lastFocused.current;
    lastFocused.current = null;
    if (target instanceof HTMLElement) {
      target.focus();
    }
  }, []);

  const togglePalette = useCallback(() => {
    setOpen((value) => {
      if (!value && document.activeElement instanceof Element) {
        lastFocused.current = document.activeElement;
      }
      if (value) {
        const target = lastFocused.current;
        lastFocused.current = null;
        if (target instanceof HTMLElement) {
          target.focus();
        }
      }
      return !value;
    });
  }, []);

  const toggleRef = useRef(togglePalette);
  toggleRef.current = togglePalette;

  useEffect(() => {
    if (!commands.has(PALETTE_TOGGLE_COMMAND)) {
      commands.registerCommand(
        PALETTE_TOGGLE_COMMAND,
        () => toggleRef.current(),
        { label: "Toggle Command Palette", shortcut: PALETTE_TOGGLE_SHORTCUT },
      );
    }
  }, [commands]);

  const value = useMemo<PaletteApi>(
    () => ({ open, openPalette, closePalette, togglePalette }),
    [open, openPalette, closePalette, togglePalette],
  );
  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}

export function usePalette(): PaletteApi {
  const api = useContext(PaletteContext);
  if (!api) {
    throw new Error("usePalette must be used within a PaletteProvider");
  }
  return api;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Global keydown dispatcher: resolves the pressed combo against commands
 * carrying a `shortcut` and executes via the registry — the SAME command
 * objects the buttons use. Guards: ignores e.defaultPrevented and key
 * repeats; inside editable targets only the palette toggle passes through.
 * Mount once (inside WorkbenchShell), never per preset.
 */
export function ShortcutProvider({ children }: { children: ReactNode }) {
  const commands = useCommands();
  const { open, closePalette } = usePalette();
  const stateRef = useRef({ commands, open, closePalette });
  stateRef.current = { commands, open, closePalette };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }
      const {
        commands: registry,
        open: paletteOpen,
        closePalette: close,
      } = stateRef.current;
      if (paletteOpen && event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (isEditableTarget(event.target)) {
        if (matchesEvent(event, PALETTE_TOGGLE_SHORTCUT)) {
          event.preventDefault();
          registry.execute(PALETTE_TOGGLE_COMMAND);
        }
        return;
      }
      for (const command of registry.list()) {
        if (command.shortcut && matchesEvent(event, command.shortcut)) {
          event.preventDefault();
          registry.execute(command.id);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <>{children}</>;
}
