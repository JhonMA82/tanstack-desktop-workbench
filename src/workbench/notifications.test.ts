import { describe, expect, test } from "bun:test";
import {
  createToast,
  MAX_TOASTS,
  resolveDurationMs,
  type Toast,
  toastsReducer,
} from "./notifications";

function makeToast(id: string, now = 1000): Toast {
  return {
    id,
    title: id,
    tone: "info",
    durationMs: 5000,
    paused: false,
    remainingMs: null,
    expiresAt: now + 5000,
  };
}

describe("resolveDurationMs", () => {
  test("info/success/warning default to 5s, errors are sticky", () => {
    expect(resolveDurationMs({ title: "a", tone: "info" })).toBe(5000);
    expect(resolveDurationMs({ title: "a", tone: "success" })).toBe(5000);
    expect(resolveDurationMs({ title: "a", tone: "warning" })).toBe(5000);
    expect(resolveDurationMs({ title: "a", tone: "error" })).toBeNull();
  });

  test("explicit durationMs wins, including sticky null", () => {
    expect(
      resolveDurationMs({ title: "a", tone: "info", durationMs: 1000 }),
    ).toBe(1000);
    expect(
      resolveDurationMs({ title: "a", tone: "info", durationMs: null }),
    ).toBeNull();
    // Errors can opt into auto-dismiss.
    expect(
      resolveDurationMs({ title: "a", tone: "error", durationMs: 2000 }),
    ).toBe(2000);
  });
});

describe("createToast", () => {
  test("assigns unique ids and resolves expiry", () => {
    const a = createToast({ title: "a", tone: "info" }, 1000);
    const b = createToast({ title: "b", tone: "info" }, 1000);
    expect(a.id).not.toBe(b.id);
    expect(a.expiresAt).toBe(6000);
    const sticky = createToast({ title: "e", tone: "error" }, 1000);
    expect(sticky.expiresAt).toBeNull();
  });
});

describe("toastsReducer", () => {
  test("enqueue appends and caps the stack by pruning the oldest", () => {
    let state: Toast[] = [];
    for (let i = 0; i < MAX_TOASTS + 2; i++) {
      state = toastsReducer(state, {
        type: "enqueue",
        toast: makeToast(`t-${i}`),
      });
    }
    expect(state).toHaveLength(MAX_TOASTS);
    expect(state[0].id).toBe("t-2");
    expect(state[state.length - 1].id).toBe(`t-${MAX_TOASTS + 1}`);
  });

  test("dismiss and expire remove by id; unknown ids are no-ops", () => {
    const state = [makeToast("a"), makeToast("b")];
    expect(
      toastsReducer(state, { type: "dismiss", id: "a" }).map((t) => t.id),
    ).toEqual(["b"]);
    expect(
      toastsReducer(state, { type: "expire", id: "b" }).map((t) => t.id),
    ).toEqual(["a"]);
    expect(toastsReducer(state, { type: "dismiss", id: "zzz" })).toHaveLength(
      2,
    );
  });

  test("pause freezes expiry bookkeeping; resume re-arms with remainder", () => {
    const state = [makeToast("a", 1000)];
    const paused = toastsReducer(state, { type: "pause", id: "a", now: 2000 });
    expect(paused[0].paused).toBe(true);
    expect(paused[0].expiresAt).toBeNull();
    expect(paused[0].remainingMs).toBe(4000);

    const resumed = toastsReducer(paused, {
      type: "resume",
      id: "a",
      now: 9000,
    });
    expect(resumed[0].paused).toBe(false);
    expect(resumed[0].expiresAt).toBe(13000);
    expect(resumed[0].remainingMs).toBeNull();
  });

  test("pause is a no-op for sticky or already-paused toasts", () => {
    const sticky: Toast = {
      ...makeToast("s"),
      durationMs: null,
      expiresAt: null,
    };
    expect(
      toastsReducer([sticky], { type: "pause", id: "s", now: 2000 })[0],
    ).toEqual(sticky);
    const paused = toastsReducer([makeToast("a", 1000)], {
      type: "pause",
      id: "a",
      now: 2000,
    });
    expect(
      toastsReducer(paused, { type: "pause", id: "a", now: 3000 }),
    ).toEqual(paused);
  });

  test("clear empties the stack", () => {
    const state = [makeToast("a"), makeToast("b")];
    expect(toastsReducer(state, { type: "clear" })).toEqual([]);
  });
});
