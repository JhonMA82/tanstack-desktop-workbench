import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useCommands } from "./commands";
import type { ToolDefinition } from "./types";

export interface ToolRegistry {
  registerTool(tool: ToolDefinition): void;
  get(id: string): ToolDefinition | undefined;
  has(id: string): boolean;
  list(): ToolDefinition[];
  listByGroup(group: string): ToolDefinition[];
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();
  return {
    registerTool(tool) {
      if (tools.has(tool.id)) {
        throw new Error(`Duplicate tool id: "${tool.id}"`);
      }
      tools.set(tool.id, tool);
    },
    get: (id) => tools.get(id),
    has: (id) => tools.has(id),
    list: () => [...tools.values()],
    listByGroup: (group) =>
      [...tools.values()].filter((tool) => tool.group === group),
  };
}

/** Shared registry used by the demo presets. Tests should use createToolRegistry(). */
export const globalTools = createToolRegistry();

export interface ToolApi {
  activeToolId: string | null;
  selectTool(id: string): void;
  getTool(id: string): ToolDefinition | undefined;
  tools: ToolDefinition[];
}

const ToolContext = createContext<ToolApi | null>(null);

export function ToolProvider({
  registry,
  initialTool,
  children,
}: {
  registry?: ToolRegistry;
  initialTool?: string;
  children: ReactNode;
}) {
  const activeRegistry = useMemo(() => registry ?? globalTools, [registry]);
  const [activeToolId, setActiveToolId] = useState<string | null>(
    initialTool ?? null,
  );
  const commands = useCommands();

  const selectTool = useCallback(
    (id: string) => {
      const tool = activeRegistry.get(id);
      if (!tool) {
        return;
      }
      setActiveToolId(id);
      commands.execute(tool.command, { toolId: id });
    },
    [activeRegistry, commands],
  );

  const value = useMemo<ToolApi>(
    () => ({
      activeToolId,
      selectTool,
      getTool: (id: string) => activeRegistry.get(id),
      tools: activeRegistry.list(),
    }),
    [activeRegistry, activeToolId, selectTool],
  );

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
}

export function useTools(): ToolApi {
  const api = useContext(ToolContext);
  if (!api) {
    throw new Error("useTools must be used within a ToolProvider");
  }
  return api;
}
