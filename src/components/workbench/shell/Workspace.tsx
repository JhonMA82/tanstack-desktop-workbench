import type { ReactNode } from "react";

/** Horizontal work area between ribbon and command bar. */
export function Workspace({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-row">{children}</div>;
}
