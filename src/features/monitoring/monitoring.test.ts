import { describe, expect, it } from "bun:test";
import { sparklinePoints } from "../../components/workbench/widgets/StatTile";
import {
  isKnownFeature,
  resolveFeatures,
  resolveFeaturesOrThrow,
} from "../../workbench/features";
import { globalPresets } from "../../workbench/layouts";
import {
  DEMO_TILES,
  eventAt,
  formatTileValue,
  summarizeTiles,
  tileHistory,
  tileToneAt,
  tileValueAt,
} from "./monitoringDemo";
import "./monitoringPreset";
import { monitoringPreset } from "./monitoringPreset";

describe("monitoring preset defaults", () => {
  it("resolves defaults without errors", () => {
    const { features, errors } = resolveFeatures(monitoringPreset);
    expect(errors).toEqual([]);
    expect(features).toEqual([
      "system-summary",
      "source-nav",
      "tile-wall",
      "viewport",
      "alert-strip",
      "event-stream",
      "statusbar",
    ]);
  });

  it("is registered under the monitoring layout id", () => {
    expect(globalPresets.has("monitoring")).toBe(true);
    expect(globalPresets.get("monitoring")?.slots.center).toContain(
      "tile-wall",
    );
  });

  it("declares no right slot: no inspector, no ribbon", () => {
    expect(monitoringPreset.slots.right).toEqual([]);
    expect(monitoringPreset.slots.top).not.toContain("ribbon");
  });
});

describe("monitoring feature ids", () => {
  const ids = [
    "tile-wall",
    "alert-strip",
    "event-stream",
    "system-summary",
    "source-nav",
  ] as const;

  it("recognizes every monitoring feature id", () => {
    for (const id of ids) {
      expect(isKnownFeature(id)).toBe(true);
    }
  });

  it("hosts every monitoring id in the preset slots", () => {
    for (const id of ids) {
      const { errors } = resolveFeatures(monitoringPreset, { with: [id] });
      expect(errors).toEqual([]);
    }
  });

  it("rejects unknown with/without ids", () => {
    const { errors } = resolveFeatures(monitoringPreset, {
      // @ts-expect-error probe: unknown feature ids are rejected
      with: ["teleport"],
      // @ts-expect-error probe: unknown feature ids are rejected
      without: ["cloak"],
    });
    expect(errors).toHaveLength(2);
  });
});

describe("monitoring load-bearing tile wall", () => {
  it("errors when the tile wall is disabled", () => {
    const { errors } = resolveFeatures(monitoringPreset, {
      without: ["tile-wall"],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(
      'Feature "tile-wall" is load-bearing for preset "monitoring"',
    );
  });

  it("errors when the viewport is disabled", () => {
    const { errors } = resolveFeatures(monitoringPreset, {
      without: ["viewport"],
    });
    expect(errors.join("\n")).toMatch(
      'Feature "viewport" is load-bearing for preset "monitoring"',
    );
  });

  it("throws a readable error through resolveFeaturesOrThrow", () => {
    expect(() =>
      resolveFeaturesOrThrow(monitoringPreset, { without: ["tile-wall"] }),
    ).toThrow('Invalid feature combination for preset "monitoring"');
  });

  it("stays coherent when optional capabilities drop", () => {
    const { features, errors } = resolveFeatures(monitoringPreset, {
      without: ["source-nav", "event-stream"],
    });
    expect(errors).toEqual([]);
    expect(features).not.toContain("source-nav");
    expect(features).toContain("tile-wall");
  });
});

describe("monitoring demo helpers", () => {
  const tile = DEMO_TILES[0];

  it("computes deterministic live values", () => {
    expect(tileValueAt(tile, 3)).toBe(tileValueAt(tile, 3));
    expect(formatTileValue(tile, 3)).toBe(tileValueAt(tile, 3).toFixed(1));
  });

  it("escalates tone when the value crosses warnAbove", () => {
    const warnTile = DEMO_TILES.find((entry) => entry.id === "spindle-load");
    expect(warnTile).toBeDefined();
    if (warnTile) {
      let sawWarning = false;
      for (let tick = 0; tick < 20; tick += 1) {
        if (tileToneAt(warnTile, tick) === "warning") {
          sawWarning = true;
        }
      }
      expect(sawWarning).toBe(true);
    }
  });

  it("summarizes the wall state", () => {
    const summary = summarizeTiles(DEMO_TILES, 0);
    expect(typeof summary.state).toBe("string");
    expect(summary.active).toBeGreaterThanOrEqual(0);
  });

  it("returns oldest-first history for the sparkline", () => {
    const history = tileHistory(tile, 5);
    expect(history).toHaveLength(12);
    expect(history[history.length - 1]).toBe(tileValueAt(tile, 5));
  });

  it("generates deterministic events per tick", () => {
    expect(eventAt(2)).toEqual(eventAt(2));
    expect(eventAt(2).id).toBe("event-2");
  });

  it("maps sparkline values to a polyline", () => {
    expect(sparklinePoints([])).toBe("");
    expect(sparklinePoints([1, 2, 3]).split(" ")).toHaveLength(3);
  });
});
