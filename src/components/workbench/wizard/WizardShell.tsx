import type { ReactNode } from "react";
import { WbButton } from "../primitives/Buttons";
import type { UseWizardResult } from "./useWizard";

export interface WizardShellProps {
  /** Live wizard cursor from `useWizard` (steps, gating, and navigation). */
  wizard: UseWizardResult;
  /** Body of the current step; receives the current index. */
  renderStep: (index: number) => ReactNode;
  /** Label of the terminal action; shown only when `onFinish` is provided. */
  finishLabel?: string;
  /** Terminal action on the last step; omit it for content-owned endings. */
  onFinish?: () => void;
  /** Hide the step rail (lets presets collapse it via feature flags). */
  showRail?: boolean;
  /** Hide the Back/Next footer (lets presets collapse it via feature flags). */
  showNav?: boolean;
}

/**
 * Generic linear wizard frame: step rail, current-step content, Back/Next
 * footer. Zero domain knowledge: titles, gating (`canProceed` +
 * `disabledReason`), and step bodies all come from the caller.
 *
 * Keyboard choice: Enter NEVER advances the wizard. Step bodies contain
 * text inputs, textareas, and selects, so a global Enter-to-advance would
 * clash with typing, implicit form submits, and native select behavior.
 * Navigation is explicit Back/Next buttons only; rail buttons revisit
 * visited steps. Step bodies should still prevent implicit form submits
 * (their forms have no submit button and prevent default on submit).
 */
export function WizardShell({
  wizard,
  renderStep,
  finishLabel = "Finish",
  onFinish,
  showRail = true,
  showNav = true,
}: WizardShellProps) {
  const { steps, current, index, visited, isFirst, isLast } = wizard;
  const blocked = !current.canProceed;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--wb-background)]">
      <div className="flex min-h-0 flex-1">
        {showRail ? (
          <nav
            aria-label="Setup steps"
            className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] p-1.5"
          >
            <ol className="flex flex-col gap-0.5">
              {steps.map((step, stepIndex) => {
                const isCurrent = stepIndex === index;
                const isDone = stepIndex < index;
                const canRevisit =
                  visited.includes(stepIndex) || stepIndex === index;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!canRevisit}
                      onClick={() => wizard.goTo(stepIndex)}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed ${
                        isCurrent
                          ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
                          : "text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--wb-text-muted)]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isCurrent
                            ? "bg-white/25 text-white"
                            : isDone
                              ? "bg-[var(--wb-accent)] text-[var(--wb-accent-contrast)]"
                              : "border border-[var(--wb-border)] text-[var(--wb-text-disabled)]"
                        }`}
                      >
                        {isDone ? "✓" : stepIndex + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold">
                          {step.title}
                        </span>
                        {step.description ? (
                          <span
                            className={`block truncate text-[10px] ${isCurrent ? "text-white/70" : "text-[var(--wb-text-disabled)]"}`}
                          >
                            {step.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <section
          aria-label={`Step ${index + 1} of ${steps.length}: ${current.title}`}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4"
        >
          <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
            {renderStep(index)}
          </div>
        </section>
      </div>
      {showNav ? (
        <footer className="flex h-11 shrink-0 items-center gap-2 border-t border-[var(--wb-border-subtle)] bg-[var(--wb-surface)] px-3">
          <span className="wb-mono text-[10px] text-[var(--wb-text-disabled)]">
            Step {index + 1} of {steps.length}
          </span>
          <span
            aria-hidden
            className="h-1 w-24 overflow-hidden rounded-full bg-[var(--wb-surface-hover)]"
          >
            <span
              className="block h-full rounded-full bg-[var(--wb-accent)] transition-all"
              style={{ width: `${Math.round(wizard.progress * 100)}%` }}
            />
          </span>
          {blocked && current.disabledReason ? (
            <span
              role="status"
              className="truncate text-[10px] text-[var(--wb-text-muted)]"
            >
              {current.disabledReason}
            </span>
          ) : null}
          <div className="flex flex-1 justify-end gap-1.5">
            <WbButton
              variant="default"
              size="small"
              disabled={isFirst}
              onClick={wizard.back}
            >
              Back
            </WbButton>
            {isLast ? (
              onFinish ? (
                <WbButton
                  variant="primary"
                  size="small"
                  disabled={blocked}
                  title={blocked ? current.disabledReason : undefined}
                  onClick={onFinish}
                >
                  {finishLabel}
                </WbButton>
              ) : null
            ) : (
              <WbButton
                variant="primary"
                size="small"
                disabled={blocked}
                title={blocked ? current.disabledReason : undefined}
                onClick={wizard.next}
              >
                Next
              </WbButton>
            )}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
