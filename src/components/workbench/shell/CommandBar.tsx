import { Terminal } from "lucide-react";
import { useRef, useState } from "react";
import { useTools } from "../../../workbench/tools";
import { CommandInput } from "../primitives/CommandInput";

interface HistoryEntry {
  seq: number;
  text: string;
  matched: boolean;
}

/** Command line with history (F2) and tool matching. No CAD logic inside. */
export function CommandBar() {
  const { tools, selectTool } = useTools();
  const [value, setValue] = useState("");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const seq = useRef(0);

  const submit = () => {
    const text = value.trim();
    if (!text) {
      return;
    }
    const needle = text.toUpperCase();
    const match = tools.find(
      (tool) =>
        tool.id.toUpperCase() === needle || tool.label.toUpperCase() === needle,
    );
    if (match) {
      selectTool(match.id);
    }
    seq.current += 1;
    const entry: HistoryEntry = {
      seq: seq.current,
      text,
      matched: match !== undefined,
    };
    setEntries((prev) => [entry, ...prev].slice(0, 50));
    setValue("");
  };

  return (
    <div className="relative flex h-[30px] shrink-0 items-center gap-2 border-t border-[var(--wb-border-subtle)] bg-[var(--wb-background)] px-2">
      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]">
        <Terminal size={12} aria-hidden />
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-[var(--wb-accent-hover)]">
        Command:
      </span>
      <CommandInput
        value={value}
        placeholder="Type a command  (e.g. LINE, CIRCLE, MOVE)  |  Press F2 for history"
        onChange={setValue}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "F2") {
            event.preventDefault();
            setHistoryOpen((open) => !open);
          }
          if (event.key === "Escape") {
            setValue("");
            setHistoryOpen(false);
          }
        }}
      />
      <span className="wb-mono hidden shrink-0 text-[10px] text-[var(--wb-text-disabled)] sm:inline">
        Enter | ESC Cancel
      </span>
      {historyOpen ? (
        <div
          role="log"
          aria-label="Command history"
          className="wb-mono absolute inset-x-2 bottom-8 z-20 max-h-40 overflow-y-auto rounded-md border border-[var(--wb-border)] bg-[var(--wb-surface)] p-1.5 text-[11px] shadow-xl"
        >
          {entries.length === 0 ? (
            <p className="px-1 py-0.5 text-[var(--wb-text-disabled)]">
              No commands yet.
            </p>
          ) : (
            entries.map((entry) => (
              <p
                key={entry.seq}
                className={`px-1 py-0.5 ${entry.matched ? "text-[var(--wb-text)]" : "text-[var(--wb-text-disabled)]"}`}
              >
                {entry.matched ? "✓" : "?"} {entry.text}
              </p>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
