import { describe, expect, it } from "bun:test";
import { Ruler } from "lucide-react";
import { createWidgetRegistry } from "../widgets";

function def(id: string, position: "right" | "left" = "right", visible = true) {
  return {
    id,
    title: id,
    icon: Ruler,
    component: () => null,
    defaultPosition: position,
    visible,
  };
}

describe("widget registry", () => {
  it("registers widgets with default visibility", () => {
    const registry = createWidgetRegistry();
    registry.registerWidget(def("properties"));
    expect(registry.isVisible("properties")).toBe(true);
    expect(registry.visible("right").map((widget) => widget.id)).toEqual([
      "properties",
    ]);
  });

  it("rejects duplicate ids", () => {
    const registry = createWidgetRegistry();
    registry.registerWidget(def("properties"));
    expect(() => registry.registerWidget(def("properties"))).toThrow(
      'Duplicate widget id: "properties"',
    );
  });

  it("shows, hides, and toggles visibility", () => {
    const registry = createWidgetRegistry();
    registry.registerWidget(def("console"));
    registry.hide("console");
    expect(registry.isVisible("console")).toBe(false);
    expect(registry.visible()).toHaveLength(0);
    registry.show("console");
    expect(registry.isVisible("console")).toBe(true);
    registry.toggle("console");
    expect(registry.isVisible("console")).toBe(false);
    registry.toggle("console");
    expect(registry.isVisible("console")).toBe(true);
  });

  it("filters visible widgets by position", () => {
    const registry = createWidgetRegistry();
    registry.registerWidget(def("properties", "right"));
    registry.registerWidget(def("layers", "left", false));
    expect(registry.visible("left")).toHaveLength(0);
    registry.show("layers");
    expect(registry.visible("left").map((widget) => widget.id)).toEqual([
      "layers",
    ]);
  });

  it("throws for unknown widget ids", () => {
    const registry = createWidgetRegistry();
    expect(() => registry.show("missing")).toThrow(
      'Unknown widget id: "missing"',
    );
  });
});
