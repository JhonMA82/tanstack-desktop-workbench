import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCommands } from "../../../workbench/commands";
import { usePalette } from "../../../workbench/palette";
import { filterCommands, formatShortcut } from "../../../workbench/shortcuts";

/**
 * Ctrl/Cmd+K command palette: top-centered overlay with filter input,
 * arrow-key navigation, Enter to execute, Esc to close. Rendered via
 * portal; tokens only (--wb-*). Overlay/backdrop conventions mirror
 * the generic Dialog primitive.
 */
export function CommandPalette() {
  const { open, closePalette } = usePalette();
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(closePalette);
  closeRef.current = closePalette;

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (event.target === overlayRef.current) {
        closeRef.current();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!open) {
    return null;
  }

  const results = filterCommands(commands.list(), query);
  const clamped =
    results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  const run = (id: string) => {
    commands.execute(id);
    closePalette();
  };

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(results.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[clamped];
      if (target) {
        run(target.id);
      }
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-4"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--wb-backdrop) 72%, transparent)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="mt-[8vh] flex h-fit max-h-[60vh] w-[min(560px,100%)] flex-col overflow-hidden rounded-md border border-[var(--wb-border)] bg-[var(--wb-surface)] shadow-xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          placeholder="Type a command… (Enter to run, Esc to close)"
          aria-label="Filter commands"
          role="combobox"
          aria-expanded="true"
          aria-controls="wb-palette-list"
          aria-autocomplete="list"
          className="h-10 shrink-0 border-b border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] px-3 text-[13px] text-[var(--wb-text)] outline-none placeholder:text-[var(--wb-text-disabled)]"
        />
        {results.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-[var(--wb-text-disabled)]">
            No matching commands.
          </p>
        ) : (
          <ul
            id="wb-palette-list"
            aria-label="Matching commands"
            className="min-h-0 overflow-y-auto p-1"
          >
            {results.map((command, index) => {
              const active = index === clamped;
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    onClick={() => run(command.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    aria-current={active ? "true" : undefined}
                    ref={(el) => {
                      if (active) {
                        el?.scrollIntoView({ block: "nearest" });
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] ${
                      active
                        ? "bg-[var(--wb-surface-hover)] text-[var(--wb-text)]"
                        : "text-[var(--wb-text-muted)]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {command.label ?? command.id}
                    </span>
                    <span className="wb-mono shrink-0 truncate text-[10px] text-[var(--wb-text-disabled)]">
                      {command.id}
                    </span>
                    {command.shortcut ? (
                      <kbd className="wb-mono shrink-0 rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] px-1.5 py-0.5 text-[10px] text-[var(--wb-text-muted)]">
                        {formatShortcut(command.shortcut)}
                      </kbd>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
