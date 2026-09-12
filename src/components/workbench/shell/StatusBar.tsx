import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useStatus } from "../../../workbench/status";
import { StatusToggle } from "../primitives/StatusToggle";

interface StatusBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Live center content (e.g. coordinates pill). Provided by the layout. */
  centerContent: ReactNode;
  scale?: string;
  onCleanScreen?: () => void;
  cleanScreenActive?: boolean;
}

/** Bottom bar: document tabs, live readout pill, registered toggles, scale. */
export function StatusBar({
  tabs,
  activeTab,
  onTabChange,
  centerContent,
  scale,
  onCleanScreen,
  cleanScreenActive,
}: StatusBarProps) {
  const { toggles, isActive, toggle } = useStatus();

  return (
    <footer className="flex h-7 shrink-0 items-center gap-1 bg-[var(--wb-accent)] px-2 text-white">
      <div
        className="flex min-w-0 items-center"
        role="tablist"
        aria-label="Documents"
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
              className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                active
                  ? "bg-white/25 text-white"
                  : "text-white/70 hover:bg-black/15 hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
        <button
          type="button"
          title="New layout"
          aria-label="New layout"
          className="flex h-5 w-5 items-center justify-center rounded-sm text-white/70 transition-colors hover:bg-black/15 hover:text-white"
        >
          <Plus size={12} aria-hidden />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="wb-mono flex items-center gap-2 rounded-full bg-black/20 px-3 py-0.5 text-[10px] text-white">
          {centerContent}
        </div>
      </div>
      <fieldset
        className="m-0 flex shrink-0 items-center gap-0.5 border-0 p-0"
        aria-label="Drawing aids"
      >
        {toggles.map((item) => (
          <StatusToggle
            key={item.id}
            label={item.label}
            title={
              item.shortcut ? `${item.label} (${item.shortcut})` : item.label
            }
            active={isActive(item.id)}
            onClick={() => toggle(item.id)}
          />
        ))}
      </fieldset>
      {scale ? (
        <span className="wb-mono shrink-0 px-1 text-[10px] font-semibold text-white">
          {scale}
        </span>
      ) : null}
      <button
        type="button"
        aria-pressed={cleanScreenActive ?? false}
        onClick={onCleanScreen}
        className="shrink-0 rounded-sm bg-[var(--wb-surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--wb-surface-hover)]"
      >
        Clean Screen
      </button>
    </footer>
  );
}
