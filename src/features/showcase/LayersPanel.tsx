import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/workbench/primitives/Badge";
import { DataTable } from "../../components/workbench/primitives/DataTable";
import { IconButton } from "../../components/workbench/primitives/IconButton";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import { PropertyRow } from "../../components/workbench/primitives/PropertyRow";
import type { Layer } from "./demoData";
import { initialLayers } from "./demoData";

/** Layers table with live toggles; selection drives the details readout. */
export function LayersPanel() {
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [selectedId, setSelectedId] = useState<string>("walls");

  const selected = layers.find((layer) => layer.id === selectedId);

  const flip = (id: string, key: "visible" | "locked") => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, [key]: !layer[key] } : layer,
      ),
    );
  };

  return (
    <Panel>
      <PanelHeader title="Layers" />
      <div className="grid min-h-0 gap-2 p-2 lg:grid-cols-[1fr_220px]">
        <DataTable<Layer>
          label="Layers"
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => (
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.colorVar }}
                  />
                  {row.name}
                </span>
              ),
            },
            {
              key: "linetype",
              header: "Linetype",
              render: (row) => <span className="wb-mono">{row.linetype}</span>,
            },
            {
              key: "visible",
              header: "Visible",
              render: (row) => (
                <IconButton
                  icon={row.visible ? Eye : EyeOff}
                  label={`${row.visible ? "Hide" : "Show"} ${row.name}`}
                  active={row.visible}
                  onClick={() => flip(row.id, "visible")}
                />
              ),
            },
            {
              key: "locked",
              header: "Locked",
              render: (row) => (
                <IconButton
                  icon={row.locked ? Lock : LockOpen}
                  label={`${row.locked ? "Unlock" : "Lock"} ${row.name}`}
                  active={row.locked}
                  onClick={() => flip(row.id, "locked")}
                />
              ),
            },
            {
              key: "state",
              header: "State",
              render: (row) => (
                <Badge tone={row.frozen ? "neutral" : "success"}>
                  {row.frozen ? "Frozen" : "Active"}
                </Badge>
              ),
            },
          ]}
          rows={layers}
          getRowId={(row) => row.id}
          selectedId={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
        />
        <div
          aria-live="polite"
          className="rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] p-2"
        >
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
            Details
          </h3>
          {selected ? (
            <>
              <PropertyRow label="Name">{selected.name}</PropertyRow>
              <PropertyRow label="Linetype" mono>
                {selected.linetype}
              </PropertyRow>
              <PropertyRow label="Visible">
                {selected.visible ? "Yes" : "No"}
              </PropertyRow>
              <PropertyRow label="Locked">
                {selected.locked ? "Yes" : "No"}
              </PropertyRow>
              <PropertyRow label="State">
                {selected.frozen ? "Frozen" : "Active"}
              </PropertyRow>
            </>
          ) : (
            <p className="text-[11px] text-[var(--wb-text-disabled)]">
              Select a row
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
