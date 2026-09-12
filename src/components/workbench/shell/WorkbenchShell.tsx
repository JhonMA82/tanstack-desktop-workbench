import type { ReactNode } from "react";

/** Vertical composition root: Ribbon / Workspace / CommandBar / StatusBar. */
export function WorkbenchShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--wb-border)] bg-[var(--wb-surface)] text-[var(--wb-text)]">
      {children}
    </div>
  );
}
