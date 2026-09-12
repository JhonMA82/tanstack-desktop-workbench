import { SlimToolbar } from "../../components/workbench/shell/SlimToolbar";
import { StatusBar } from "../../components/workbench/shell/StatusBar";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { PlaceholderCanvas } from "../../components/workbench/viewport/PlaceholderCanvas";
import { Viewport } from "../../components/workbench/viewport/Viewport";
import { hasFeature } from "../../workbench/features";
import { StatusProvider } from "../../workbench/status";
import type { FeatureId } from "../../workbench/types";
import { minimalPreset } from "./minimalPreset";

interface MinimalWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Minimal composition: slim toolbar, plain workspace, status bar.
 * Deliberately small; each region collapses when its feature is disabled.
 */
export function MinimalWorkbench({
  features = minimalPreset.defaultFeatures,
}: MinimalWorkbenchProps) {
  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "toolbar") ? (
          <SlimToolbar title="Workspace" />
        ) : null}
        <Viewport>
          <PlaceholderCanvas
            title="Workspace"
            subtitle="Single-task content renders here"
          />
        </Viewport>
        {hasFeature(features, "statusbar") ? (
          <StatusBar
            tabs={["ready"]}
            activeTab="ready"
            onTabChange={() => undefined}
            centerContent={<span>ready</span>}
          />
        ) : null}
      </WorkbenchShell>
    </StatusProvider>
  );
}
