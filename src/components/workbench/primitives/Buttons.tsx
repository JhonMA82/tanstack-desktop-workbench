import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "default" | "ghost" | "danger";
type ButtonSize = "default" | "small";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--wb-accent)] bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)] hover:bg-[var(--wb-accent-hover)]",
  default:
    "border-[var(--wb-border)] bg-[var(--wb-surface-raised)] text-[var(--wb-text)] hover:bg-[var(--wb-surface-hover)]",
  ghost:
    "border-transparent bg-transparent text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]",
  danger:
    "border-[var(--wb-status-error)] bg-[var(--wb-status-error)] text-[var(--wb-accent-contrast)] hover:opacity-90",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "h-7 px-3 text-[11px]",
  small: "h-6 px-2 text-[11px]",
};

/** Generic workbench button. Complements IconButton/ToolButton. */
export function WbButton({
  variant = "default",
  size = "default",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-sm border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variantClass[variant]} ${sizeClass[size]} ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

/** Right-aligned action row for forms and dialog footers. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1.5">{children}</div>
  );
}
