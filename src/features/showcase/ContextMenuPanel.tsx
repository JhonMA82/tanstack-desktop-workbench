import { useEffect, useState } from "react";
import { ContextMenuTrigger } from "../../components/workbench/primitives/ContextMenuTrigger";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import { PropertyRow } from "../../components/workbench/primitives/PropertyRow";
import { CommandProvider, useCommands } from "../../workbench/commands";
import type { MenuItem } from "../../workbench/menus";

const DUPLICATE_COMMAND = "menu.duplicate";
const RENAME_COMMAND = "menu.rename";

function ContextMenuDemo() {
  const commands = useCommands();
  const [lastAction, setLastAction] = useState("none");

  // Demo commands backing the command-fed rows (same objects a ribbon
  // button or the palette would run; execution here is a deliberate noop,
  // the readout below proves which entry fired).
  useEffect(() => {
    if (!commands.has(DUPLICATE_COMMAND)) {
      commands.registerCommand(DUPLICATE_COMMAND, () => {}, {
        label: "Duplicate",
        shortcut: "Ctrl+D",
      });
    }
    if (!commands.has(RENAME_COMMAND)) {
      commands.registerCommand(RENAME_COMMAND, () => {}, {
        label: "Rename",
        shortcut: "F2",
      });
    }
  }, [commands]);

  const menu: MenuItem[] = [
    { command: DUPLICATE_COMMAND },
    { command: RENAME_COMMAND },
    { separator: true },
    { label: "Paste", shortcut: "Ctrl+V", disabled: true },
    // Danger row: activation is reported through onAction (readout below).
    { label: "Delete", shortcut: "Del", danger: true },
  ];

  return (
    <Panel>
      <PanelHeader title="Context menu" />
      <div className="flex flex-col gap-2 p-2">
        <ContextMenuTrigger menu={menu} onAction={setLastAction}>
          <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-[var(--wb-border)] bg-[var(--wb-background)] px-3 text-center text-[11px] text-[var(--wb-text-muted)]">
            Right-click here: command items, separator, disabled, danger,
            shortcut hints.
          </div>
        </ContextMenuTrigger>
        <div
          aria-live="polite"
          className="rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] p-2"
        >
          <PropertyRow label="Last action" mono>
            {lastAction}
          </PropertyRow>
        </div>
      </div>
    </Panel>
  );
}

/**
 * Context-menu showcase. Self-provisioned provider: the `/demo/controls`
 * route renders outside WorkbenchShell.
 */
export function ContextMenuPanel() {
  return (
    <CommandProvider>
      <ContextMenuDemo />
    </CommandProvider>
  );
}
