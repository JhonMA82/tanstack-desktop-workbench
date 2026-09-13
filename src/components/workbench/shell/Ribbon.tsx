import { CircleHelp, Search } from "lucide-react";
import { useState } from "react";
import { useTools } from "../../../workbench/tools";
import type { RibbonTab } from "../../../workbench/types";
import { IconButton } from "../primitives/IconButton";
import {
  ToolButton,
  ToolbarSeparator,
  ToolGroup,
} from "../primitives/ToolButton";

/** Data-driven ribbon: tabs -> groups -> tool ids resolved through the tool registry. */
export function Ribbon({ tabs }: { tabs: RibbonTab[] }) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const { getTool, activeToolId, selectTool } = useTools();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <div className="shrink-0">
      <div
        className="flex h-[34px] items-stretch gap-0.5 bg-[var(--wb-tabstrip)] px-2"
        role="tablist"
        aria-label="Ribbon tabs"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTabId(tab.id)}
              className={`relative px-3 text-[11px] transition-colors ${
                active
                  ? "bg-[var(--wb-surface)] font-semibold text-[var(--wb-text)]"
                  : "text-[var(--wb-text-muted)] hover:text-[var(--wb-text)]"
              }`}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--wb-accent)]" />
              ) : null}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <IconButton icon={Search} label="Search commands" />
          <IconButton icon={CircleHelp} label="Help" />
        </div>
      </div>
      {activeTab ? (
        <div className="flex h-[92px] items-stretch gap-1 overflow-x-auto border-b border-[var(--wb-border)] bg-[var(--wb-surface)] px-2 py-1.5">
          {activeTab.groups.map((group, index) => (
            <div key={group.id} className="flex shrink-0 items-stretch">
              {index > 0 ? <ToolbarSeparator /> : null}
              <ToolGroup label={group.label}>
                {group.tools.map((toolId, toolIndex) => {
                  const tool = getTool(toolId);
                  if (!tool) {
                    return null;
                  }
                  return (
                    <ToolButton
                      key={tool.id}
                      icon={tool.icon}
                      label={tool.label}
                      title={tool.tooltip ?? tool.label}
                      large={toolIndex === 0}
                      orientation="stacked"
                      shortcut={tool.shortcut}
                      active={tool.id === activeToolId}
                      onClick={() => selectTool(tool.id)}
                    />
                  );
                })}
              </ToolGroup>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
