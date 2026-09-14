import { useState } from "react";
import {
  FormField,
  TextInput,
} from "../../components/workbench/primitives/Fields";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import { SlimToolbar } from "../../components/workbench/shell/SlimToolbar";
import { StatusBar } from "../../components/workbench/shell/StatusBar";
import { WorkbenchShell } from "../../components/workbench/shell/WorkbenchShell";
import { hasFeature } from "../../workbench/features";
import { StatusProvider } from "../../workbench/status";
import type { FeatureId } from "../../workbench/types";
import { formsPreset } from "./formsPreset";

interface FormsWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Forms composition: navigation beside a form workspace with an inspector.
 * Viewport-free; every region collapses when its feature is disabled and the
 * form stays load-bearing so the workspace always has a host.
 */
export function FormsWorkbench({
  features = formsPreset.defaultFeatures,
}: FormsWorkbenchProps) {
  const [name, setName] = useState("");
  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "toolbar") ? <SlimToolbar title="Forms" /> : null}
        <div className="flex min-h-0 flex-1">
          {hasFeature(features, "navigation") ? (
            <Panel
              title="Navigation"
              className="w-48 shrink-0 border-r border-[var(--wb-border-subtle)]"
            >
              <PanelHeader title="Navigation" />
              <div className="flex flex-col gap-1 p-2 text-[11px] text-[var(--wb-text-muted)]">
                <span className="rounded-sm bg-[var(--wb-surface-hover)] px-2 py-1 text-[var(--wb-text)]">
                  General
                </span>
                <span className="px-2 py-1">Details</span>
                <span className="px-2 py-1">Review</span>
              </div>
            </Panel>
          ) : null}
          {hasFeature(features, "form") ? (
            <Panel title="Form" className="min-w-0 flex-1">
              <PanelHeader title="Form" />
              <div className="flex flex-col gap-2 p-3">
                <FormField label="Name" htmlFor="forms-name" hint="Demo field">
                  <TextInput
                    id="forms-name"
                    value={name}
                    placeholder="Type a name"
                    onChange={setName}
                  />
                </FormField>
              </div>
            </Panel>
          ) : null}
          {hasFeature(features, "inspector") ? (
            <Panel
              title="Inspector"
              className="w-56 shrink-0 border-l border-[var(--wb-border-subtle)]"
            >
              <PanelHeader title="Inspector" />
              <div className="p-2 text-[11px] text-[var(--wb-text-muted)]">
                Selection details render here.
              </div>
            </Panel>
          ) : null}
        </div>
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
