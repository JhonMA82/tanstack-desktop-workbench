import { useState } from "react";
import { Badge } from "../../components/workbench/primitives/Badge";
import { DataTable } from "../../components/workbench/primitives/DataTable";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import type { Job } from "./demoData";
import { demoJobs } from "./demoData";

/** Jobs table: progress bars, status badges, mono durations. */
export function JobsPanel() {
  const [selectedId, setSelectedId] = useState<string>("J-1042");
  const selected = demoJobs.find((job) => job.id === selectedId);

  return (
    <Panel>
      <PanelHeader title="Jobs" />
      <div className="p-2">
        <DataTable<Job>
          label="Jobs"
          columns={[
            {
              key: "id",
              header: "Id",
              render: (row) => <span className="wb-mono">{row.id}</span>,
            },
            {
              key: "operation",
              header: "Operation",
              render: (row) => row.operation,
            },
            {
              key: "progress",
              header: "Progress",
              render: (row) => (
                <span className="flex items-center gap-1.5">
                  <span
                    role="progressbar"
                    aria-valuenow={row.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.operation} progress`}
                    className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--wb-surface-hover)]"
                  >
                    <span
                      aria-hidden
                      className="block h-full rounded-full bg-[var(--wb-accent)]"
                      style={{ width: `${row.progress}%` }}
                    />
                  </span>
                  <span className="wb-mono text-[10px] text-[var(--wb-text-muted)]">
                    {row.progress}%
                  </span>
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={row.tone}>{row.status}</Badge>,
            },
            {
              key: "duration",
              header: "Duration",
              align: "right",
              render: (row) => row.duration,
            },
          ]}
          rows={demoJobs}
          getRowId={(row) => row.id}
          selectedId={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
        />
        <p
          aria-live="polite"
          className="mt-1.5 text-[11px] text-[var(--wb-text-muted)]"
        >
          {selected
            ? `${selected.id} — ${selected.operation} (${selected.progress}%)`
            : "Select a row"}
        </p>
      </div>
    </Panel>
  );
}
