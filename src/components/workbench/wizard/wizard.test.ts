import { describe, expect, it } from "bun:test";
import {
  canVisit,
  createWizardState,
  type WizardStep,
  wizardBack,
  wizardGoTo,
  wizardNext,
  wizardProgress,
  wizardRestart,
} from "./wizard";

function steps(gates: boolean[]): WizardStep[] {
  return gates.map((canProceed, index) => ({
    id: `step-${index}`,
    title: `Step ${index + 1}`,
    canProceed,
    disabledReason: canProceed ? undefined : "Blocked.",
  }));
}

describe("wizard next/back bounds", () => {
  it("advances one step and records the visit", () => {
    const state = createWizardState(3);
    const next = wizardNext(state, steps([true, true, true]));
    expect(next.index).toBe(1);
    expect(next.visited).toEqual([0, 1]);
  });

  it("stays put when backing off the first step", () => {
    const state = createWizardState(3);
    expect(wizardBack(state)).toEqual(state);
  });

  it("stays put when advancing off the last step", () => {
    const state = { index: 2, visited: [0, 1, 2] };
    expect(wizardNext(state, steps([true, true, true]))).toEqual(state);
  });

  it("moves back without forgetting visited steps", () => {
    const state = { index: 2, visited: [0, 1, 2] };
    const back = wizardBack(state);
    expect(back.index).toBe(1);
    expect(back.visited).toEqual([0, 1, 2]);
  });
});

describe("wizard canProceed gating", () => {
  it("blocks next while the current step cannot proceed", () => {
    const state = createWizardState(3);
    expect(wizardNext(state, steps([false, true, true]))).toEqual(state);
  });

  it("unblocks next once the gate opens", () => {
    const state = createWizardState(3);
    const next = wizardNext(state, steps([true, true, true]));
    expect(next.index).toBe(1);
  });

  it("keeps gating per step, not global", () => {
    const state = { index: 1, visited: [0, 1] };
    expect(wizardNext(state, steps([true, false, true]))).toEqual(state);
  });
});

describe("wizard goTo and no-skip rule", () => {
  it("revisits visited steps", () => {
    const state = { index: 2, visited: [0, 1, 2] };
    expect(wizardGoTo(state, steps([true, true, true]), 0).index).toBe(0);
  });

  it("enters the immediate next step", () => {
    const state = createWizardState(4);
    expect(canVisit(state, 4, 1)).toBe(true);
    expect(wizardGoTo(state, steps([true, true, true, true]), 1).index).toBe(1);
  });

  it("refuses to skip ahead past the immediate next step", () => {
    const state = createWizardState(4);
    expect(canVisit(state, 4, 2)).toBe(false);
    expect(canVisit(state, 4, 3)).toBe(false);
    expect(wizardGoTo(state, steps([true, true, true, true]), 2)).toEqual(
      state,
    );
  });

  it("rejects out-of-range targets", () => {
    const state = createWizardState(3);
    expect(wizardGoTo(state, steps([true, true, true]), -1)).toEqual(state);
    expect(wizardGoTo(state, steps([true, true, true]), 3)).toEqual(state);
  });

  it("records the first visit when entering the next step", () => {
    const state = createWizardState(3);
    const moved = wizardGoTo(state, steps([true, true, true]), 1);
    expect(moved.visited).toEqual([0, 1]);
  });
});

describe("wizard progress and restart", () => {
  it("reports quarters of a four-step flow", () => {
    expect(wizardProgress(createWizardState(4), 4)).toBe(0.25);
    expect(wizardProgress({ index: 3, visited: [0, 1, 2, 3] }, 4)).toBe(1);
  });

  it("reports zero for an empty flow", () => {
    expect(wizardProgress(createWizardState(0), 0)).toBe(0);
  });

  it("restarts from the first step with a fresh trail", () => {
    const state = { index: 3, visited: [0, 1, 2, 3] };
    expect(wizardRestart(4)).toEqual(createWizardState(4));
    expect(wizardRestart(4)).not.toEqual(state);
  });

  it("clamps an out-of-range initial index", () => {
    expect(createWizardState(3, 9).index).toBe(2);
    expect(createWizardState(3, -4).index).toBe(0);
  });
});
