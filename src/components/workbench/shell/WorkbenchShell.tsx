import type { ReactNode } from "react";
import { ToastsProvider } from "../../../workbench/notifications";
import { PaletteProvider, ShortcutProvider } from "../../../workbench/palette";
import { CommandPalette } from "./CommandPalette";
import { ToastStack } from "./ToastStack";

/**
 * Vertical composition root: Ribbon / Workspace / CommandBar / StatusBar.
 * Also mounts the global shortcut dispatcher, command palette, and toast
 * stack once, so every preset gets them without per-preset wiring.
 */
export function WorkbenchShell({ children }: { children: ReactNode }) {
  return (
    <PaletteProvider>
      <ShortcutProvider>
        <ToastsProvider>
          <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--wb-border)] bg-[var(--wb-surface)] text-[var(--wb-text)]">
            {children}
          </div>
          <CommandPalette />
          <ToastStack />
        </ToastsProvider>
      </ShortcutProvider>
    </PaletteProvider>
  );
}
