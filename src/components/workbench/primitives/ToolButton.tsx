import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ToolButtonProps {
  icon: LucideIcon;
  label?: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  /** Large stacked variant (ribbon) vs compact row variant. */
  large?: boolean;
  /** Layout orientation. `"row"` keeps icon + label side by side;
   * `"stacked"` renders icon-over-label with fixed icon/label boxes
   * so mixed sizes stay aligned. Defaults to `"row"`. */
  orientation?: "stacked" | "row";
  shortcut?: string;
  onClick?: () => void;
}

/** Generic tool button. Knows nothing about CAD. */
export function ToolButton({
  icon: Icon,
  label,
  title,
  active,
  disabled,
  large,
  orientation = "row",
  shortcut,
  onClick,
}: ToolButtonProps) {
  const hint = [title ?? label, shortcut ? `(${shortcut})` : null]
    .filter(Boolean)
    .join(" ");
  if (orientation === "stacked") {
    const width = large ? "w-13" : "w-11";
    const iconSize = large ? 20 : 16;
    return (
      <button
        type="button"
        title={hint}
        aria-label={label}
        aria-pressed={active ?? false}
        disabled={disabled}
        onClick={onClick}
        className={`flex ${width} flex-col items-center justify-start self-stretch rounded-sm px-1 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
            : "text-[var(--wb-text)] hover:bg-[var(--wb-surface-hover)]"
        }`}
      >
        <span className="flex h-8 items-center justify-center">
          <Icon size={iconSize} strokeWidth={1.75} aria-hidden />
        </span>
        {label ? (
          <span className="flex min-h-5 items-start justify-center text-center text-[10px] leading-tight">
            {label}
          </span>
        ) : null}
      </button>
    );
  }
  if (large) {
    return (
      <button
        type="button"
        title={hint}
        aria-label={label}
        aria-pressed={active ?? false}
        disabled={disabled}
        onClick={onClick}
        className={`flex w-13 flex-col items-center justify-center gap-1 rounded-sm px-1 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
            : "text-[var(--wb-text)] hover:bg-[var(--wb-surface-hover)]"
        }`}
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden />
        {label ? (
          <span className="text-[10px] leading-none">{label}</span>
        ) : null}
      </button>
    );
  }
  return (
    <button
      type="button"
      title={hint}
      aria-label={label}
      aria-pressed={active ?? false}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6.5 min-w-7 items-center justify-center gap-1 rounded-sm px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
          : "text-[var(--wb-text)] hover:bg-[var(--wb-surface-hover)]"
      }`}
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      {label ? (
        <span className="whitespace-nowrap text-[11px] leading-none">
          {label}
        </span>
      ) : null}
    </button>
  );
}

export function ToolGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <div className="flex min-h-0 flex-1 items-stretch gap-0.5 px-1.5">
        {children}
      </div>
      <div className="mt-1 text-center text-[10px] leading-none text-[var(--wb-text-muted)]">
        {label}
      </div>
    </fieldset>
  );
}

export function ToolbarSeparator() {
  return (
    <div
      className="mx-0.5 w-px self-stretch bg-[var(--wb-border-subtle)]"
      aria-hidden
    />
  );
}
