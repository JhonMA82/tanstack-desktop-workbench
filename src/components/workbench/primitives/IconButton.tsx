import type { LucideIcon } from "lucide-react";

export function IconButton({
  icon: Icon,
  label,
  title,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  title?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={active ?? false}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${
        active
          ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
          : "text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
      }`}
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
