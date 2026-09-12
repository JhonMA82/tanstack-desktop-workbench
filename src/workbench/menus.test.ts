import { describe, expect, it } from "bun:test";
import { createCommandRegistry } from "./commands";
import { clampMenuPosition, resolveMenuItems } from "./menus";

function registryWithCommands() {
  const commands = createCommandRegistry();
  commands.registerCommand("view.reset", () => {}, {
    label: "Reset view",
    shortcut: "R",
  });
  commands.registerCommand("grid.toggle", () => {}, { label: "Toggle Grid" });
  return commands;
}

describe("resolveMenuItems", () => {
  it("pulls label and shortcut from the registry for command entries", () => {
    const rows = resolveMenuItems(
      [{ command: "view.reset" }],
      registryWithCommands(),
    );
    expect(rows).toEqual([
      {
        kind: "item",
        label: "Reset view",
        shortcut: "R",
        danger: false,
        disabled: false,
        command: "view.reset",
      },
    ]);
  });

  it("falls back to the id when a command has no label", () => {
    const commands = createCommandRegistry();
    commands.registerCommand("bare", () => {});
    const rows = resolveMenuItems([{ command: "bare" }], commands);
    expect(rows[0]).toMatchObject({ kind: "item", label: "bare" });
  });

  it("passes inline entries through untouched", () => {
    const onSelect = () => {};
    const rows = resolveMenuItems(
      [{ label: "Delete", danger: true, shortcut: "Del", onSelect }],
      registryWithCommands(),
    );
    expect(rows[0]).toMatchObject({
      kind: "item",
      label: "Delete",
      danger: true,
      disabled: false,
      shortcut: "Del",
    });
  });

  it("marks disabled inline entries", () => {
    const rows = resolveMenuItems(
      [{ label: "Paste", disabled: true }],
      registryWithCommands(),
    );
    expect(rows[0]).toMatchObject({ kind: "item", disabled: true });
  });

  it("keeps separators as separator rows", () => {
    const rows = resolveMenuItems(
      [{ command: "grid.toggle" }, { separator: true }],
      registryWithCommands(),
    );
    expect(rows[1]).toEqual({ kind: "separator" });
  });

  it("throws fail-fast on unknown command ids", () => {
    expect(() =>
      resolveMenuItems([{ command: "nope.missing" }], registryWithCommands()),
    ).toThrow('Unknown command in menu: "nope.missing"');
  });

  it("resolves an empty menu to zero rows", () => {
    expect(resolveMenuItems([], registryWithCommands())).toEqual([]);
  });
});

describe("clampMenuPosition", () => {
  const viewport = { width: 800, height: 600 };

  it("leaves a fully visible menu alone", () => {
    expect(clampMenuPosition(100, 120, 200, 160, viewport)).toEqual({
      x: 100,
      y: 120,
    });
  });

  it("pulls an overflowing menu back inside", () => {
    expect(clampMenuPosition(700, 550, 200, 160, viewport)).toEqual({
      x: 600,
      y: 440,
    });
  });

  it("pins to zero when the menu is larger than the viewport", () => {
    expect(clampMenuPosition(50, 50, 900, 700, viewport)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("clamps negative origins to zero", () => {
    expect(clampMenuPosition(-20, -10, 200, 160, viewport)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
