import type { LucideIcon } from "lucide-react";

export interface ActivityItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Small count badge rendered over the icon. */
  badge?: string;
}

interface ActivityBarProps {
  items: ActivityItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Narrow icon column for switching sidebar views. Item list is owned by the
 * preset; the bar never hardcodes views or commands.
 */
export function ActivityBar({ items, activeId, onSelect }: ActivityBarProps) {
  return (
    <nav
      aria-label="Activity"
      className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-[var(--wb-surface-raised)] py-2"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => onSelect(item.id)}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-[var(--wb-surface-hover)] text-[var(--wb-text)]"
                : "text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
            }`}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--wb-accent)]"
              />
            ) : null}
            <Icon size={19} strokeWidth={1.75} aria-hidden />
            {item.badge ? (
              <span
                aria-hidden
                className="wb-mono absolute right-0.5 top-0.5 rounded-full bg-[var(--wb-accent)] px-1 text-[8px] font-bold leading-tight text-[var(--wb-accent-contrast)]"
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
