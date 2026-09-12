interface DocumentTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  label?: string;
}

/**
 * Horizontal document/workspace tab strip. Tabs are plain labels owned by the
 * preset; selection state lives with the caller.
 */
export function DocumentTabs({
  tabs,
  activeTab,
  onTabChange,
  label = "Documents",
}: DocumentTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex h-9 shrink-0 items-stretch gap-px overflow-x-auto bg-[var(--wb-tabstrip)] px-1 pt-1"
    >
      {tabs.map((tab) => {
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab)}
            className={`max-w-44 truncate rounded-t-md px-3 text-[11px] transition-colors ${
              active
                ? "bg-[var(--wb-background)] font-semibold text-[var(--wb-text)]"
                : "text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
