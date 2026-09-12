import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`flex min-h-0 flex-col bg-[var(--wb-surface-raised)] text-[var(--wb-text)] ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  icon: Icon,
  title,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[var(--wb-border-subtle)] px-2">
      {Icon ? (
        <Icon size={13} className="text-[var(--wb-text-muted)]" aria-hidden />
      ) : null}
      <h2 className="flex-1 truncate text-[11px] font-semibold tracking-wide">
        {title}
      </h2>
      {actions}
    </header>
  );
}

export function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--wb-border-subtle)] px-2 py-1.5">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}
