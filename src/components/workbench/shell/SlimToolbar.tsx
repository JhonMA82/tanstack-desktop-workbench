import type { ReactNode } from "react";

interface SlimToolbarProps {
  /** Application or workspace title shown at the leading edge. */
  title?: string;
  /** Center content, e.g. a workspace selector or search field. */
  children?: ReactNode;
  /** Trailing actions. */
  actions?: ReactNode;
  label?: string;
}

/**
 * Slim top bar for presets without a ribbon: title, optional center content,
 * optional trailing actions. Renders nothing when fully empty so the slot
 * collapses instead of leaving an empty chrome bar.
 */
export function SlimToolbar({
  title,
  children,
  actions,
  label = "Toolbar",
}: SlimToolbarProps) {
  if (!title && !children && !actions) {
    return null;
  }
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] px-3"
    >
      {title ? (
        <span className="shrink-0 text-[11px] font-semibold tracking-wide text-[var(--wb-text)]">
          {title}
        </span>
      ) : null}
      {children ? (
        <div className="flex min-w-0 flex-1 items-center justify-center">
          {children}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}
