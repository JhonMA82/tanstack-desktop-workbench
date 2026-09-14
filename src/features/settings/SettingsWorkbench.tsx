import { useState } from "react";
import {
  FormField,
  SelectInput,
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
import { settingsPreset } from "./settingsPreset";

interface SettingsWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Settings composition: slim toolbar over a centered form with a status bar.
 * Viewport-free; every region collapses when its feature is disabled and the
 * form stays load-bearing so the workspace always has a host.
 */
export function SettingsWorkbench({
  features = settingsPreset.defaultFeatures,
}: SettingsWorkbenchProps) {
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState("system");
  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "toolbar") ? (
          <SlimToolbar title="Settings" />
        ) : null}
        {hasFeature(features, "form") ? (
          <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
            <Panel
              title="Settings"
              className="w-full max-w-lg self-start rounded-md border border-[var(--wb-border-subtle)]"
            >
              <PanelHeader title="Settings" />
              <div className="flex flex-col gap-2 p-3">
                <FormField
                  label="Display name"
                  htmlFor="settings-display-name"
                  hint="Demo field"
                >
                  <TextInput
                    id="settings-display-name"
                    value={displayName}
                    placeholder="Type a name"
                    onChange={setDisplayName}
                  />
                </FormField>
                <FormField label="Theme" htmlFor="settings-theme">
                  <SelectInput
                    id="settings-theme"
                    value={theme}
                    options={[
                      { value: "system", label: "System" },
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                    ]}
                    onChange={setTheme}
                  />
                </FormField>
              </div>
            </Panel>
          </div>
        ) : null}
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
