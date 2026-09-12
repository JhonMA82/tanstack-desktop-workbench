import type { ReactNode } from "react";

/** Label/value row for property grids. */
export function PropertyRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[86px_1fr] items-center gap-2 py-0.5">
      <span className="truncate text-[11px] text-[var(--wb-text-muted)]">
        {label}
      </span>
      <span
        className={`truncate text-[11px] text-[var(--wb-text)] ${mono ? "wb-mono" : ""}`}
      >
        {children}
      </span>
    </div>
  );
}
