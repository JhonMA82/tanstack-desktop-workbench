import { createContext, type ReactNode, useContext, useMemo } from "react";
import type {
  CommandHandler,
  CommandOptions,
  RegisteredCommand,
} from "./types";

export interface CommandRegistry {
  registerCommand(
    id: string,
    execute: CommandHandler,
    opts?: CommandOptions,
  ): void;
  /** Runs a command. Returns false when the id is unknown. */
  execute(id: string, args?: unknown): boolean;
  has(id: string): boolean;
  get(id: string): RegisteredCommand | undefined;
  list(): RegisteredCommand[];
  history(): string[];
}

export interface UnhandledCommandError {
  id: string;
  error: unknown;
}

/** Default reporter: loud in the console, never silent. */
function reportToConsole(event: UnhandledCommandError): void {
  console.error(
    '[workbench] async command "%s" failed:',
    event.id,
    event.error,
  );
}

let unhandledHandler = reportToConsole;

/**
 * Override where async command failures go (e.g. status bar, toast, telemetry).
 * Pass `undefined` to restore the default console reporter.
 */
export function setUnhandledCommandErrorHandler(
  handler: ((event: UnhandledCommandError) => void) | undefined,
): void {
  unhandledHandler = handler ?? reportToConsole;
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
      const result = command.execute(args);
      if (result instanceof Promise) {
        // Fire-and-forget: execute() keeps its sync boolean contract.
        // Rejections go to the reporter (default: console.error), never silent.
        result.catch((error: unknown) => unhandledHandler({ id, error }));
      }
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
