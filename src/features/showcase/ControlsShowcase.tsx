import { Eye, Lock, Plus } from "lucide-react";
import { useState } from "react";
import {
  FormActions,
  WbButton,
} from "../../components/workbench/primitives/Buttons";
import {
  FormField,
  NumberInput,
  SelectInput,
  Textarea,
  TextInput,
} from "../../components/workbench/primitives/Fields";
import { IconButton } from "../../components/workbench/primitives/IconButton";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import { PropertyRow } from "../../components/workbench/primitives/PropertyRow";
import {
  Checkbox,
  RadioGroup,
  Slider,
  Switch,
} from "../../components/workbench/primitives/Toggles";
import { JobsPanel } from "./JobsPanel";
import { LayersPanel } from "./LayersPanel";
import { ModalsPanel } from "./ModalsPanel";

const readoutClass =
  "rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] p-2";

/** Demo-only showcase of workbench-styled form and data components. */
export function ControlsShowcase() {
  const [name, setName] = useState("Bracket v3");
  const [tolerance, setTolerance] = useState("0.05");
  const [linetype, setLinetype] = useState("continuous");
  const [notes, setNotes] = useState("Deburr all edges.");
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(false);
  const [visible, setVisible] = useState(true);
  const [units, setUnits] = useState("mm");
  const [lineweight, setLineweight] = useState(0.5);
  const [opacity, setOpacity] = useState(100);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--wb-background)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 p-4">
        <header>
          <h1 className="text-[13px] font-semibold text-[var(--wb-text)]">
            Controls showcase
          </h1>
          <p className="text-[11px] text-[var(--wb-text-muted)]">
            Workbench-styled form and data primitives. Every control below is
            interactive; edits update the readouts.
          </p>
        </header>

        <Panel>
          <PanelHeader title="Buttons" />
          <div className="flex flex-wrap items-center gap-1.5 p-2">
            <WbButton variant="primary">Apply</WbButton>
            <WbButton>Reset</WbButton>
            <WbButton variant="ghost">Cancel</WbButton>
            <WbButton variant="primary" size="small">
              Small
            </WbButton>
            <WbButton size="small">Small</WbButton>
            <WbButton disabled>Disabled</WbButton>
            <IconButton icon={Plus} label="Add" />
            <IconButton icon={Eye} label="Visible" active />
            <IconButton icon={Lock} label="Locked" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Inputs & selects" />
          <div className="grid gap-3 p-2 md:grid-cols-[1fr_220px]">
            <div className="flex min-w-0 flex-col gap-2">
              <FormField
                label="Name"
                htmlFor="demo-name"
                hint="Part or layer name"
              >
                <TextInput
                  id="demo-name"
                  value={name}
                  placeholder="Untitled"
                  onChange={setName}
                />
              </FormField>
              <div className="grid gap-2 sm:grid-cols-2">
                <FormField
                  label="Tolerance"
                  htmlFor="demo-tol"
                  hint="Millimeters"
                >
                  <NumberInput
                    id="demo-tol"
                    value={tolerance}
                    min={0}
                    step={0.01}
                    onChange={setTolerance}
                  />
                </FormField>
                <FormField label="Linetype" htmlFor="demo-ltype">
                  <SelectInput
                    id="demo-ltype"
                    value={linetype}
                    onChange={setLinetype}
                    options={[
                      { value: "continuous", label: "Continuous" },
                      { value: "dashed", label: "Dashed" },
                      { value: "dotted", label: "Dotted" },
                      { value: "dashdot", label: "DashDot" },
                    ]}
                  />
                </FormField>
              </div>
              <FormField label="Notes" htmlFor="demo-notes">
                <Textarea
                  id="demo-notes"
                  value={notes}
                  rows={2}
                  onChange={setNotes}
                />
              </FormField>
              <FormField
                label="Reference"
                htmlFor="demo-disabled"
                hint="Read-only in this context"
              >
                <TextInput
                  id="demo-disabled"
                  value="LOCKED-001"
                  disabled
                  onChange={() => {}}
                />
              </FormField>
              <FormActions>
                <WbButton variant="ghost" size="small">
                  Cancel
                </WbButton>
                <WbButton variant="primary" size="small">
                  Save
                </WbButton>
              </FormActions>
            </div>
            <div aria-live="polite" className={readoutClass}>
              <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
                Readout
              </h3>
              <PropertyRow label="Name">{name || "—"}</PropertyRow>
              <PropertyRow label="Tolerance" mono>
                {tolerance || "—"}
              </PropertyRow>
              <PropertyRow label="Linetype" mono>
                {linetype}
              </PropertyRow>
              <PropertyRow label="Notes">{notes || "—"}</PropertyRow>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Toggles, radios & sliders" />
          <div className="grid gap-3 p-2 md:grid-cols-[1fr_220px]">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <Checkbox
                  label="Snap to grid"
                  checked={snap}
                  onChange={setSnap}
                />
                <Checkbox label="Show grid" checked={grid} onChange={setGrid} />
                <Switch
                  label="Layer visible"
                  checked={visible}
                  onChange={setVisible}
                />
              </div>
              <RadioGroup
                label="Units"
                value={units}
                onChange={setUnits}
                options={[
                  { value: "mm", label: "Millimeters" },
                  { value: "inch", label: "Inches" },
                ]}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Slider
                  id="demo-lineweight"
                  label="Lineweight"
                  value={lineweight}
                  min={0}
                  max={2}
                  step={0.05}
                  format={(v) => `${v.toFixed(2)} mm`}
                  onChange={setLineweight}
                />
                <Slider
                  id="demo-opacity"
                  label="Opacity"
                  value={opacity}
                  min={0}
                  max={100}
                  step={1}
                  format={(v) => `${v}%`}
                  onChange={setOpacity}
                />
              </div>
            </div>
            <div aria-live="polite" className={readoutClass}>
              <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
                Readout
              </h3>
              <PropertyRow label="Snap">{snap ? "On" : "Off"}</PropertyRow>
              <PropertyRow label="Grid">{grid ? "On" : "Off"}</PropertyRow>
              <PropertyRow label="Visible">
                {visible ? "Yes" : "No"}
              </PropertyRow>
              <PropertyRow label="Units">{units}</PropertyRow>
              <PropertyRow label="Lineweight" mono>
                {lineweight.toFixed(2)}
              </PropertyRow>
              <PropertyRow label="Opacity" mono>
                {opacity}%
              </PropertyRow>
            </div>
          </div>
        </Panel>

        <LayersPanel />
        <JobsPanel />
        <ModalsPanel />
      </div>
    </div>
  );
}
