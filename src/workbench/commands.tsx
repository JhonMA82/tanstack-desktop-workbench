import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CommandOptions, RegisteredCommand } from "./types";

export interface CommandRegistry {
  registerCommand(
    id: string,
    execute: (args?: unknown) => void,
    opts?: CommandOptions,
  ): void;
  /** Runs a command. Returns false when the id is unknown. */
  execute(id: string, args?: unknown): boolean;
  has(id: string): boolean;
  get(id: string): RegisteredCommand | undefined;
  list(): RegisteredCommand[];
  history(): string[];
}

export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, RegisteredCommand>();
  const past: string[] = [];
  return {
    registerCommand(id, execute, opts) {
      if (commands.has(id)) {
        throw new Error(`Duplicate command id: "${id}"`);
      }
      commands.set(id, {
        id,
        execute,
        label: opts?.label,
        shortcut: opts?.shortcut,
      });
    },
    execute(id, args) {
      const command = commands.get(id);
      if (!command) {
        return false;
      }
      command.execute(args);
      past.push(id);
      return true;
    },
    has: (id) => commands.has(id),
    get: (id) => commands.get(id),
    list: () => [...commands.values()],
    history: () => [...past],
  };
}

/** Shared registry used by the demo presets. Tests should use createCommandRegistry(). */
export const globalCommands = createCommandRegistry();

const CommandRegistryContext = createContext<CommandRegistry>(globalCommands);

export function CommandProvider({
  registry,
  children,
}: {
  registry?: CommandRegistry;
  children: ReactNode;
}) {
  const value = useMemo(() => registry ?? globalCommands, [registry]);
  return (
    <CommandRegistryContext.Provider value={value}>
      {children}
    </CommandRegistryContext.Provider>
  );
}

export function useCommands(): CommandRegistry {
  return useContext(CommandRegistryContext);
}
