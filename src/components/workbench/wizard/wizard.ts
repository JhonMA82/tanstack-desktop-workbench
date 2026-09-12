/**
 * Generic linear wizard transition core: pure state transitions with zero
 * React and zero domain knowledge. The `useWizard` hook wraps these for UI.
 *
 * Linearity rule (explicitly out of scope: branching): the step list is fixed
 * and ordered. `next` advances one step when the current step allows it;
 * `goTo` revisits visited steps or enters the immediate next one, never
 * skipping ahead. Conditional or branching steps are a documented future;
 * this core has no branch primitives by design.
 */

export interface WizardStep {
  /** Stable id for keys and tests. */
  id: string;
  /** Short label shown in the step rail. */
  title: string;
  /** Optional longer hint shown under the title. */
  description?: string;
  /** When false, `next` is blocked and the footer shows `disabledReason`. */
  canProceed: boolean;
  /** Human-readable hint for why Next is disabled. */
  disabledReason?: string;
}

export interface WizardState {
  /** Zero-based index of the current step. */
  index: number;
  /** Every step index visited so far, in first-visit order. */
  visited: readonly number[];
}

/** Initial state: current at `initialIndex`, everything before it visited. */
export function createWizardState(
  stepCount: number,
  initialIndex = 0,
): WizardState {
  if (stepCount <= 0) {
    return { index: 0, visited: [] };
  }
  const index = Math.min(Math.max(initialIndex, 0), stepCount - 1);
  const visited: number[] = [];
  for (let step = 0; step <= index; step += 1) {
    visited.push(step);
  }
  return { index, visited };
}

/** Highest visited index, or -1 when nothing was visited yet. */
function maxVisited(visited: readonly number[]): number {
  let max = -1;
  for (const step of visited) {
    if (step > max) {
      max = step;
    }
  }
  return max;
}

/**
 * True when `target` may be entered: it is in range and either already
 * visited or exactly the immediate next step (no skipping ahead).
 */
export function canVisit(
  state: WizardState,
  stepCount: number,
  target: number,
): boolean {
  if (!Number.isInteger(target) || target < 0 || target >= stepCount) {
    return false;
  }
  if (state.visited.includes(target)) {
    return true;
  }
  return target === maxVisited(state.visited) + 1;
}

function withVisit(state: WizardState, target: number): WizardState {
  if (state.visited.includes(target)) {
    return { index: target, visited: state.visited };
  }
  return { index: target, visited: [...state.visited, target] };
}

/**
 * Advance one step. Blocked (returns the input state) on the last step or
 * when the current step's `canProceed` is false.
 */
export function wizardNext(
  state: WizardState,
  steps: readonly WizardStep[],
): WizardState {
  const current = steps[state.index];
  if (!current?.canProceed) {
    return state;
  }
  const target = state.index + 1;
  if (target >= steps.length) {
    return state;
  }
  return withVisit(state, target);
}

/** Move back one step. Blocked (returns the input state) on the first step. */
export function wizardBack(state: WizardState): WizardState {
  if (state.index <= 0) {
    return state;
  }
  return { index: state.index - 1, visited: state.visited };
}

/**
 * Jump to `target` when `canVisit` allows it, recording first visits.
 * Disallowed targets return the input state unchanged.
 */
export function wizardGoTo(
  state: WizardState,
  steps: readonly WizardStep[],
  target: number,
): WizardState {
  if (!canVisit(state, steps.length, target)) {
    return state;
  }
  return withVisit(state, target);
}

/** Fresh state for restarting the flow from the first step. */
export function wizardRestart(stepCount: number): WizardState {
  return createWizardState(stepCount, 0);
}

/** Fraction of the flow reached: (index + 1) / stepCount, 0 when empty. */
export function wizardProgress(state: WizardState, stepCount: number): number {
  if (stepCount <= 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(state.index, 0), stepCount - 1);
  return (clamped + 1) / stepCount;
}
