import { describe, expect, test } from "bun:test";
import {
  clampScale,
  MAX_SCALE,
  MIN_SCALE,
  toTransform,
  zoomAt,
} from "./usePanZoom";

describe("clampScale", () => {
  test("clamps below min and above max", () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(100)).toBe(MAX_SCALE);
    expect(clampScale(1.5)).toBe(1.5);
  });

  test("NaN falls back to 1", () => {
    expect(clampScale(Number.NaN)).toBe(1);
  });
});

describe("zoomAt", () => {
  test("zooming toward the cursor keeps the cursor point fixed", () => {
    const state = { x: 10, y: 20, k: 1 };
    const cursor = { x: 100, y: 50 };
    const next = zoomAt(state, cursor, 2);
    expect(next.k).toBe(2);
    // Content point under cursor before == after: (c - t) / k is invariant.
    expect((cursor.x - next.x) / next.k).toBeCloseTo(
      (cursor.x - state.x) / state.k,
    );
    expect((cursor.y - next.y) / next.k).toBeCloseTo(
      (cursor.y - state.y) / state.k,
    );
  });

  test("clamped zoom returns the same state reference", () => {
    const state = { x: 0, y: 0, k: MAX_SCALE };
    expect(zoomAt(state, { x: 5, y: 5 }, 2)).toBe(state);
    const min = { x: 0, y: 0, k: MIN_SCALE };
    expect(zoomAt(min, { x: 5, y: 5 }, 0.1)).toBe(min);
  });

  test("zooming out around the origin recenters proportionally", () => {
    const next = zoomAt({ x: 40, y: 40, k: 2 }, { x: 0, y: 0 }, 0.5);
    expect(next.k).toBe(1);
    expect(next.x).toBe(20);
    expect(next.y).toBe(20);
  });
});

describe("toTransform", () => {
  test("emits a translate+scale transform string", () => {
    expect(toTransform({ x: 10, y: -5, k: 2 })).toBe(
      "translate(10px, -5px) scale(2)",
    );
  });
});
