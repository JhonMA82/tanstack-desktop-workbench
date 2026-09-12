import { type ReactNode, useState } from "react";

export interface BottomTab {
  id: string;
  title: string;
  content: ReactNode;
  /** Optional count shown next to the title. */
  badge?: string | number;
}

interface BottomPanelProps {
  tabs: BottomTab[];
  defaultActiveId?: string;
  label?: string;
}

/**
 * Tabbed bottom area (problems/output/terminal/alarms/...). The preset builds
 * the tab list from the resolved features, so disabling a capability removes
 * its tab; an empty list renders nothing and the slot collapses.
 */
export function BottomPanel({
  tabs,
  defaultActiveId,
  label = "Panel",
}: BottomPanelProps) {
  const [activeId, setActiveId] = useState(
    defaultActiveId ?? tabs[0]?.id ?? "",
  );
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (tabs.length === 0 || !active) {
    return null;
  }
  return (
    <section
      aria-label={label}
      className="flex h-40 shrink-0 flex-col border-t border-[var(--wb-border-subtle)] bg-[var(--wb-surface)]"
    >
      <div
        role="tablist"
        aria-label={`${label} tabs`}
        className="flex h-8 shrink-0 items-stretch gap-0.5 px-2"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(tab.id)}
              className={`relative px-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                selected
                  ? "text-[var(--wb-text)]"
                  : "text-[var(--wb-text-muted)] hover:text-[var(--wb-text)]"
              }`}
            >
              {tab.title}
              {tab.badge !== undefined ? (
                <span className="wb-mono ml-1 rounded-full bg-[var(--wb-surface-hover)] px-1.5 text-[9px]">
                  {tab.badge}
                </span>
              ) : null}
              {selected ? (
                <span
                  aria-hidden
                  className="absolute inset-x-1 top-0 h-0.5 bg-[var(--wb-accent)]"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--wb-border-subtle)]">
        {active.content}
      </div>
    </section>
  );
}
