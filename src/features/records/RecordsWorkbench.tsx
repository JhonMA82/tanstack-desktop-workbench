import { useState } from "react";
import { DataTable } from "../../components/workbench/primitives/DataTable";
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
import { recordsPreset } from "./recordsPreset";

interface RecordRow {
  id: string;
  name: string;
  status: string;
}

const DEMO_ROWS: RecordRow[] = [
  { id: "r1", name: "Alpha", status: "Active" },
  { id: "r2", name: "Beta", status: "Draft" },
  { id: "r3", name: "Gamma", status: "Archived" },
];

interface RecordsWorkbenchProps {
  /** Resolved feature set; defaults to the preset defaults. */
  features?: FeatureId[];
}

/**
 * Records composition: navigation beside a data-table workspace with a
 * detail panel. Viewport-free; every region collapses when its feature is
 * disabled and the data table stays load-bearing so the workspace always
 * has a host.
 */
export function RecordsWorkbench({
  features = recordsPreset.defaultFeatures,
}: RecordsWorkbenchProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>("r1");
  const selected = DEMO_ROWS.find((row) => row.id === selectedId);
  return (
    <StatusProvider>
      <WorkbenchShell>
        {hasFeature(features, "toolbar") ? (
          <SlimToolbar title="Records" />
        ) : null}
        <div className="flex min-h-0 flex-1">
          {hasFeature(features, "navigation") ? (
            <Panel
              title="Navigation"
              className="w-48 shrink-0 border-r border-[var(--wb-border-subtle)]"
            >
              <PanelHeader title="Navigation" />
              <div className="flex flex-col gap-1 p-2 text-[11px] text-[var(--wb-text-muted)]">
                <span className="rounded-sm bg-[var(--wb-surface-hover)] px-2 py-1 text-[var(--wb-text)]">
                  All records
                </span>
                <span className="px-2 py-1">Active</span>
                <span className="px-2 py-1">Archived</span>
              </div>
            </Panel>
          ) : null}
          {hasFeature(features, "data-table") ? (
            <Panel title="Records" className="min-w-0 flex-1">
              <PanelHeader title="Records" />
              <div className="p-2">
                <DataTable<RecordRow>
                  label="Records"
                  columns={[
                    {
                      key: "name",
                      header: "Name",
                      render: (row) => row.name,
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (row) => row.status,
                    },
                  ]}
                  rows={DEMO_ROWS}
                  getRowId={(row) => row.id}
                  selectedId={selectedId}
                  onSelect={(row) => setSelectedId(row.id)}
                />
              </div>
            </Panel>
          ) : null}
          {hasFeature(features, "detail") ? (
            <Panel
              title="Detail"
              className="w-64 shrink-0 border-l border-[var(--wb-border-subtle)]"
            >
              <PanelHeader title="Detail" />
              <div className="p-2 text-[11px] text-[var(--wb-text-muted)]">
                {selected ? (
                  <span>
                    {selected.name} · {selected.status}
                  </span>
                ) : (
                  "Select a row to inspect it."
                )}
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
