import { Plus } from "lucide-react";
import { useTools } from "../../../workbench/tools";

/** Vertical icon rail. Tools come from the registry; the shell never hardcodes them. */
export function ToolRail({ tools }: { tools: string[] }) {
  const { getTool, activeToolId, selectTool } = useTools();

  return (
    <nav
      aria-label="Tool rail"
      className="flex w-[60px] shrink-0 flex-col items-center gap-1 overflow-y-auto bg-[var(--wb-surface-raised)] py-2"
    >
      {tools.map((toolId) => {
        const tool = getTool(toolId);
        if (!tool) {
          return null;
        }
        const Icon = tool.icon;
        const active = tool.id === activeToolId;
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.tooltip ?? tool.label}
            aria-label={tool.label}
            aria-pressed={active}
            onClick={() => selectTool(tool.id)}
            className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
                : "text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
            }`}
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
      <button
        type="button"
        title="More tools"
        aria-label="More tools"
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md text-[var(--wb-text-muted)] transition-colors hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
      >
        <Plus size={20} strokeWidth={1.75} aria-hidden />
      </button>
    </nav>
  );
}
