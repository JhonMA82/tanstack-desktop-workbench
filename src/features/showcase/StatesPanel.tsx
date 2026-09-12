import { type ReactNode, useState } from "react";
import { WbButton } from "../../components/workbench/primitives/Buttons";
import { ErrorBoundary } from "../../components/workbench/primitives/ErrorBoundary";
import {
  Panel,
  PanelHeader,
  PanelSection,
} from "../../components/workbench/primitives/Panel";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Skeleton,
} from "../../components/workbench/primitives/States";

const boxClass =
  "rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)]";

const noteClass = "mt-1.5 text-[11px] text-[var(--wb-text-muted)]";

function ExplodingView(): ReactNode {
  throw new Error("Demo crash: the boundary caught this render error.");
}

/** Empty / loading / error primitives plus an isolated boundary demo. */
export function StatesPanel() {
  const [emptyAction, setEmptyAction] = useState("—");
  const [failed, setFailed] = useState(true);
  const [armed, setArmed] = useState(false);

  return (
    <Panel>
      <PanelHeader title="Empty / loading / error states" />
      <PanelSection title="Empty">
        <div className="grid gap-2 md:grid-cols-2">
          <div className={boxClass}>
            <EmptyState
              title="No layers yet"
              message="Create a layer to start drawing."
              actionLabel="New layer"
              onAction={() => setEmptyAction("New layer clicked")}
            />
          </div>
          <div className={boxClass}>
            <EmptyState
              title="No results"
              message="Nothing matches the current filter."
            />
          </div>
        </div>
        <p className={noteClass}>Last action: {emptyAction}</p>
      </PanelSection>
      <PanelSection title="Loading">
        <div className="grid gap-2 md:grid-cols-2">
          <div className={boxClass}>
            <LoadingState label="Loading layers…" />
          </div>
          <div className={`${boxClass} p-3`}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
              Standalone skeleton
            </p>
            <Skeleton rows={4} />
          </div>
        </div>
        <div className={`${boxClass} mt-2`}>
          <LoadingState label="Loading preview…" rows={3} />
        </div>
      </PanelSection>
      <PanelSection title="Error">
        <div className={boxClass}>
          {failed ? (
            <ErrorState
              title="Export failed"
              message="Disk full. Free space and retry."
              retryLabel="Retry export"
              onRetry={() => setFailed(false)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <p className="text-[11px] font-semibold text-[var(--wb-text)]">
                Recovered
              </p>
              <p className="max-w-60 text-[11px] leading-snug text-[var(--wb-text-muted)]">
                Retry cleared the failure — no reload needed.
              </p>
              <WbButton size="small" onClick={() => setFailed(true)}>
                Fail again
              </WbButton>
            </div>
          )}
        </div>
      </PanelSection>
      <PanelSection title="Error boundary">
        <p className="mb-1.5 text-[11px] text-[var(--wb-text-muted)]">
          Isolated throw demo: this boundary wraps only the box below, so
          throwing here never breaks the rest of the page. Retry remounts the
          box.
        </p>
        <div className={boxClass}>
          <ErrorBoundary onRetry={() => setArmed(false)}>
            {armed ? (
              <ExplodingView />
            ) : (
              <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
                <p className="text-[11px] font-semibold text-[var(--wb-text)]">
                  Healthy — nothing thrown
                </p>
                <p className="max-w-60 text-[11px] leading-snug text-[var(--wb-text-muted)]">
                  Arm the crash, then use the boundary Retry to recover.
                </p>
                <WbButton size="small" onClick={() => setArmed(true)}>
                  Throw render error
                </WbButton>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </PanelSection>
    </Panel>
  );
}
