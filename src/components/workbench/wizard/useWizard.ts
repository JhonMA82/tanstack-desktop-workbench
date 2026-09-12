import { useCallback, useMemo, useState } from "react";
import {
  createWizardState,
  type WizardState,
  type WizardStep,
  wizardBack,
  wizardGoTo,
  wizardNext,
  wizardProgress,
  wizardRestart,
} from "./wizard";

export type { WizardStep };

export interface UseWizardOptions {
  /** Starting step; earlier steps count as visited. Defaults to 0. */
  initialIndex?: number;
}

export interface UseWizardResult {
  /** Live step list (drives titles plus per-step gating). */
  steps: WizardStep[];
  /** Step at the current index. */
  current: WizardStep;
  /** Zero-based index of the current step. */
  index: number;
  /** Visited step indices, in first-visit order. */
  visited: readonly number[];
  isFirst: boolean;
  isLast: boolean;
  /** Fraction of the flow reached: (index + 1) / steps.length. */
  progress: number;
  /** Advance one step; no-op when `current.canProceed` is false. */
  next: () => void;
  /** Move back one step; no-op on the first step. */
  back: () => void;
  /** Jump to a visited step or the immediate next one; else no-op. */
  goTo: (target: number) => void;
  /** Return to the first step with a fresh visited trail. */
  restart: () => void;
}

/**
 * Linear wizard cursor over a caller-owned step list. The caller rebuilds
 * `steps` every render (per-step validation lives there); this hook owns
 * only the cursor (`index` + `visited`) and delegates every transition to
 * the pure `wizard.ts` core. Linear only: no branching, no skipping ahead.
 */
export function useWizard(
  steps: WizardStep[],
  opts?: UseWizardOptions,
): UseWizardResult {
  if (steps.length === 0) {
    throw new Error("useWizard requires at least one step.");
  }
  const initialIndex = opts?.initialIndex ?? 0;
  const [state, setState] = useState<WizardState>(() =>
    createWizardState(steps.length, initialIndex),
  );

  const next = useCallback(() => {
    setState((prev) => wizardNext(prev, steps));
  }, [steps]);
  const back = useCallback(() => {
    setState((prev) => wizardBack(prev));
  }, []);
  const goTo = useCallback(
    (target: number) => {
      setState((prev) => wizardGoTo(prev, steps, target));
    },
    [steps],
  );
  const restart = useCallback(() => {
    setState(wizardRestart(steps.length));
  }, [steps]);

  return useMemo(() => {
    const index = Math.min(Math.max(state.index, 0), steps.length - 1);
    const visited = state.visited.filter((step) => step < steps.length);
    const current = steps[index];
    return {
      steps,
      current,
      index,
      visited,
      isFirst: index === 0,
      isLast: index === steps.length - 1,
      progress: wizardProgress({ index, visited }, steps.length),
      next,
      back,
      goTo,
      restart,
    };
  }, [steps, state, next, back, goTo, restart]);
}
