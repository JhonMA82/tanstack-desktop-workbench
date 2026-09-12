import { describe, expect, it } from "bun:test";
import { createStatusRegistry } from "../status";

describe("status registry", () => {
  it("registers toggles and readouts", () => {
    const registry = createStatusRegistry();
    registry.registerStatusItem({
      id: "grid",
      label: "GRID",
      kind: "toggle",
      active: true,
    });
    registry.registerStatusItem({
      id: "coords",
      label: "Coords",
      kind: "readout",
      value: "0, 0, 0",
    });
    expect(registry.isActive("grid")).toBe(true);
    expect(registry.getValue("coords")).toBe("0, 0, 0");
    expect(registry.toggles().map((item) => item.id)).toEqual(["grid"]);
  });

  it("rejects duplicate ids", () => {
    const registry = createStatusRegistry();
    registry.registerStatusItem({ id: "grid", label: "GRID", kind: "toggle" });
    expect(() =>
      registry.registerStatusItem({
        id: "grid",
        label: "GRID",
        kind: "toggle",
      }),
    ).toThrow('Duplicate status item id: "grid"');
  });

  it("toggles and sets state explicitly", () => {
    const registry = createStatusRegistry();
    registry.registerStatusItem({
      id: "ortho",
      label: "ORTHO",
      kind: "toggle",
    });
    expect(registry.isActive("ortho")).toBe(false);
    registry.toggle("ortho");
    expect(registry.isActive("ortho")).toBe(true);
    registry.setActive("ortho", false);
    expect(registry.isActive("ortho")).toBe(false);
  });

  it("updates readout values", () => {
    const registry = createStatusRegistry();
    registry.registerStatusItem({
      id: "coords",
      label: "Coords",
      kind: "readout",
    });
    registry.setValue("coords", "10.000, 5.000, 0.000");
    expect(registry.getValue("coords")).toBe("10.000, 5.000, 0.000");
  });

  it("throws for unknown ids", () => {
    const registry = createStatusRegistry();
    expect(() => registry.toggle("missing")).toThrow(
      'Unknown status item id: "missing"',
    );
  });
});
