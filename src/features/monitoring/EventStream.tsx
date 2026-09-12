import type { BadgeTone } from "../../components/workbench/primitives/Badge";
import { Badge } from "../../components/workbench/primitives/Badge";
import {
  type DataColumn,
  DataTable,
} from "../../components/workbench/primitives/DataTable";
import type { AlertSeverity, DemoEvent } from "./monitoringDemo";

const severityTone: Record<AlertSeverity, BadgeTone> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

const columns: DataColumn<DemoEvent>[] = [
  {
    key: "time",
    header: "Time",
    render: (row) => <span className="wb-mono">{row.time}</span>,
  },
  {
    key: "severity",
    header: "Severity",
    render: (row) => (
      <Badge tone={severityTone[row.severity]}>{row.severity}</Badge>
    ),
  },
  { key: "source", header: "Source", render: (row) => row.source },
  { key: "message", header: "Message", render: (row) => row.message },
];

interface EventStreamProps {
  events: DemoEvent[];
}

/** Bottom event stream: time-ordered demo events via the shared DataTable. */
export function EventStream({ events }: EventStreamProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <DataTable
        label="Event stream"
        columns={columns}
        rows={events}
        getRowId={(row) => row.id}
        emptyText="No events"
      />
    </div>
  );
}
