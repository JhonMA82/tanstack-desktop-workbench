import { useState } from "react";
import { WbButton } from "../../components/workbench/primitives/Buttons";
import { SlimToolbar } from "../../components/workbench/shell/SlimToolbar";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import {
  useWizard,
  type WizardStep,
} from "../../components/workbench/wizard/useWizard";
import { WizardShell as WizardFrame } from "../../components/workbench/wizard/WizardShell";
import { hasFeature } from "../../workbench/features";
import type { FeatureId } from "../../workbench/types";
import { ConfigureStep, ConnectStep, ReviewStep } from "./SetupSteps";
import {
  EMPTY_SETUP_DATA,
  SETUP_STEP_META,
  type SetupDemoData,
  validateConfigure,
  validateConnect,
  validateReview,
} from "./setupDemo";
import { setupPreset } from "./setupPreset";

interface SetupWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Setup composition: slim toolbar, wizard step rail beside the current step
 * body, wizard Back/Next footer, plain status line. Every region collapses
 * when its feature is disabled; the viewport stays load-bearing so the step
 * content always has a host. All step content is demo-neutral placeholders.
 */
export function SetupWorkbench({
  features = setupPreset.defaultFeatures,
}: SetupWorkbenchProps) {
  const [data, setData] = useState<SetupDemoData>(EMPTY_SETUP_DATA);
  const patch = (entry: Partial<SetupDemoData>) =>
    setData((prev) => ({ ...prev, ...entry }));

  const gates = [
    validateConnect(data),
    validateConfigure(data),
    validateReview(data),
    { canProceed: true },
  ];
  const steps: WizardStep[] = SETUP_STEP_META.map((meta, stepIndex) => ({
    ...meta,
    canProceed: gates[stepIndex]?.canProceed ?? false,
    disabledReason: gates[stepIndex]?.disabledReason,
  }));
  const wizard = useWizard(steps);

  const renderStep = (index: number) => {
    if (index === 0) {
      return <ConnectStep data={data} onChange={patch} />;
    }
    if (index === 1) {
      return <ConfigureStep data={data} onChange={patch} />;
    }
    if (index === 2) {
      return <ReviewStep data={data} onChange={patch} />;
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--wb-text)]">
            Done
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--wb-text-muted)]">
            The demo workspace{" "}
            <span className="font-semibold text-[var(--wb-text)]">
              {data.displayName || "Untitled"}
            </span>{" "}
            is ready. Nothing was provisioned: this flow keeps demo data only.
          </p>
        </div>
        <WbButton
          variant="default"
          size="small"
          onClick={() => {
            setData(EMPTY_SETUP_DATA);
            wizard.restart();
          }}
        >
          Start over
        </WbButton>
      </div>
    );
  };

  return (
    <WorkbenchShell>
      {hasFeature(features, "toolbar") ? <SlimToolbar title="Setup" /> : null}
      <WizardFrame
        wizard={wizard}
        renderStep={renderStep}
        showRail={hasFeature(features, "step-rail")}
        showNav={hasFeature(features, "wizard-nav")}
      />
      {hasFeature(features, "statusbar") ? (
        <footer className="wb-mono flex h-7 shrink-0 items-center gap-3 bg-[var(--wb-accent)] px-2 text-[10px] font-semibold text-white">
          <span>
            Step {wizard.index + 1} of {steps.length}
          </span>
          <span className="text-white/70">
            setup demo · nothing provisioned
          </span>
        </footer>
      ) : null}
    </WorkbenchShell>
  );
}
