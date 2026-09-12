import { describe, expect, it } from "bun:test";
import {
  filterCommands,
  formatShortcut,
  matchesEvent,
  parseShortcut,
} from "./shortcuts";

describe("parseShortcut", () => {
  it("parses a bare letter", () => {
    expect(parseShortcut("L")).toEqual({
      mod: false,
      shift: false,
      alt: false,
      key: "L",
    });
  });

  it("parses combos regardless of modifier order", () => {
    expect(parseShortcut("Shift+Ctrl+Z")).toEqual(
      parseShortcut("Ctrl+Shift+Z"),
    );
    expect(parseShortcut("Ctrl+Shift+Z")).toEqual({
      mod: true,
      shift: true,
      alt: false,
      key: "Z",
    });
  });

  it("treats Ctrl/Cmd/Mod aliases as the same modifier", () => {
    expect(parseShortcut("Cmd+K")).toEqual(parseShortcut("Ctrl+K"));
    expect(parseShortcut("Mod+K").mod).toBe(true);
  });

  it("normalizes Escape/Delete aliases and case", () => {
    expect(parseShortcut("esc").key).toBe("ESCAPE");
    expect(parseShortcut("Del").key).toBe("DELETE");
    expect(parseShortcut("ctrl+k").key).toBe("K");
  });

  it("parses function keys and Alt", () => {
    expect(parseShortcut("F8")).toEqual({
      mod: false,
      shift: false,
      alt: false,
      key: "F8",
    });
    expect(parseShortcut("Alt+F4")).toEqual({
      mod: false,
      shift: false,
      alt: true,
      key: "F4",
    });
  });
});

describe("matchesEvent", () => {
  it("matches a bare letter case-insensitively with no modifiers", () => {
    expect(matchesEvent({ key: "l" }, "L")).toBe(true);
    expect(matchesEvent({ key: "L" }, "L")).toBe(true);
  });

  it("rejects bare keys when any modifier is held", () => {
    expect(matchesEvent({ key: "l", ctrlKey: true }, "L")).toBe(false);
    expect(matchesEvent({ key: "L", shiftKey: true }, "L")).toBe(false);
    expect(matchesEvent({ key: "L", altKey: true }, "L")).toBe(false);
  });

  it("treats Ctrl and Cmd as interchangeable", () => {
    expect(matchesEvent({ key: "k", ctrlKey: true }, "Ctrl+K")).toBe(true);
    expect(matchesEvent({ key: "k", metaKey: true }, "Ctrl+K")).toBe(true);
    expect(matchesEvent({ key: "k", metaKey: true }, "Cmd+K")).toBe(true);
    expect(matchesEvent({ key: "k" }, "Ctrl+K")).toBe(false);
  });

  it("requires exact shift variants", () => {
    expect(
      matchesEvent({ key: "Z", ctrlKey: true, shiftKey: true }, "Ctrl+Shift+Z"),
    ).toBe(true);
    expect(matchesEvent({ key: "z", ctrlKey: true }, "Ctrl+Shift+Z")).toBe(
      false,
    );
    expect(matchesEvent({ key: "Z", ctrlKey: true }, "Ctrl+Z")).toBe(true);
    expect(
      matchesEvent({ key: "Z", ctrlKey: true, shiftKey: true }, "Ctrl+Z"),
    ).toBe(false);
  });

  it("matches Escape, Delete and function keys", () => {
    expect(matchesEvent({ key: "Escape" }, "Escape")).toBe(true);
    expect(matchesEvent({ key: "Escape", ctrlKey: true }, "Escape")).toBe(
      false,
    );
    expect(matchesEvent({ key: "Delete" }, "Delete")).toBe(true);
    expect(matchesEvent({ key: "F8" }, "F8")).toBe(true);
    expect(matchesEvent({ key: "F8", shiftKey: true }, "F8")).toBe(false);
  });

  it("rejects wrong keys and empty shortcuts", () => {
    expect(matchesEvent({ key: "m" }, "L")).toBe(false);
    expect(matchesEvent({ key: "k", ctrlKey: true }, "Ctrl+J")).toBe(false);
    expect(matchesEvent({ key: "Control", ctrlKey: true }, "")).toBe(false);
  });
});

describe("formatShortcut", () => {
  it("returns canonical modifier order", () => {
    expect(formatShortcut("Shift+Ctrl+Z")).toBe("Ctrl+Shift+Z");
    expect(formatShortcut("k")).toBe("K");
    expect(formatShortcut("Ctrl+K")).toBe("Ctrl+K");
  });
});

describe("filterCommands", () => {
  const commands = [
    { id: "draw.line", label: "Line", shortcut: "L" },
    { id: "draw.circle", label: "Circle", shortcut: "C" },
    { id: "grid.toggle", label: "Toggle Grid", shortcut: "G" },
  ];

  it("returns everything on an empty query", () => {
    expect(filterCommands(commands, "")).toEqual(commands);
    expect(filterCommands(commands, "   ")).toEqual(commands);
  });

  it("ranks prefix matches before substring matches", () => {
    const ranked = filterCommands(commands, "grid");
    expect(ranked[0]?.id).toBe("grid.toggle");
  });

  it("matches id, label and shortcut case-insensitively", () => {
    expect(filterCommands(commands, "CIRCLE").map((c) => c.id)).toEqual([
      "draw.circle",
    ]);
    expect(filterCommands(commands, "draw.").map((c) => c.id)).toEqual([
      "draw.line",
      "draw.circle",
    ]);
    expect(filterCommands(commands, "zzz")).toEqual([]);
  });
});
