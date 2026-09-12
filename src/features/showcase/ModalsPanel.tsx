import { useEffect, useState } from "react";
import {
  FormActions,
  WbButton,
} from "../../components/workbench/primitives/Buttons";
import {
  ConfirmDialog,
  Dialog,
  InfoDialog,
} from "../../components/workbench/primitives/Dialog";
import {
  FormField,
  SelectInput,
  TextInput,
} from "../../components/workbench/primitives/Fields";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import { PropertyRow } from "../../components/workbench/primitives/PropertyRow";
import {
  Checkbox,
  Switch,
} from "../../components/workbench/primitives/Toggles";

type ActiveModal = "form" | "info" | "confirm" | "danger" | "progress" | null;

const readoutClass =
  "rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] p-2";

const colorOptions = [
  { value: "red", label: "Red" },
  { value: "amber", label: "Amber" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "gray", label: "Gray" },
];

const linetypeOptions = [
  { value: "continuous", label: "Continuous" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "dashdot", label: "DashDot" },
];

/** Dialog demos: neutral form modal, info/confirm variants, locked progress. */
export function ModalsPanel() {
  const [active, setActive] = useState<ActiveModal>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("green");
  const [linetype, setLinetype] = useState("continuous");
  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState<string | null>(null);
  const [confirmOutcome, setConfirmOutcome] = useState<string | null>(null);
  const [applyOutcome, setApplyOutcome] = useState<string | null>(null);

  const close = () => setActive(null);
  const valid = name.trim().length > 0;

  const submitForm = () => {
    if (!valid) return;
    setCreated(
      `"${name.trim()}" — ${color} / ${linetype} / ${visible ? "visible" : "hidden"}${locked ? " / locked" : ""}`,
    );
    close();
  };

  useEffect(() => {
    if (active !== "progress") return;
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 10));
    }, 120);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (active !== "progress" || progress < 100) return;
    const id = window.setTimeout(() => {
      setActive(null);
      setApplyOutcome("Applied — simulated task finished");
    }, 350);
    return () => window.clearTimeout(id);
  }, [active, progress]);

  return (
    <Panel>
      <PanelHeader title="Modals" />
      <div className="flex flex-col gap-2 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <WbButton variant="primary" onClick={() => setActive("form")}>
            New layer…
          </WbButton>
          <WbButton onClick={() => setActive("info")}>Show info</WbButton>
          <WbButton onClick={() => setActive("confirm")}>Confirm</WbButton>
          <WbButton onClick={() => setActive("danger")}>
            Confirm (danger)
          </WbButton>
          <WbButton onClick={() => setActive("progress")}>
            Apply changes…
          </WbButton>
        </div>
        <div aria-live="polite" className={readoutClass}>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
            Readout
          </h3>
          <PropertyRow label="Last created">{created ?? "—"}</PropertyRow>
          <PropertyRow label="Last confirm">
            {confirmOutcome ?? "—"}
          </PropertyRow>
          <PropertyRow label="Apply status">{applyOutcome ?? "—"}</PropertyRow>
        </div>
      </div>

      <Dialog
        open={active === "form"}
        onClose={close}
        title="New layer"
        description="Neutral form demo. Create is disabled until the name is valid."
        size="sm"
        footer={
          <FormActions>
            <WbButton variant="ghost" size="small" onClick={close}>
              Cancel
            </WbButton>
            <WbButton
              variant="primary"
              size="small"
              disabled={!valid}
              onClick={submitForm}
            >
              Create layer
            </WbButton>
          </FormActions>
        }
      >
        <div className="flex min-w-0 flex-col gap-2">
          <FormField label="Name" htmlFor="modal-layer-name" required>
            <TextInput
              id="modal-layer-name"
              value={name}
              placeholder="e.g. annotations"
              onChange={setName}
            />
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Color" htmlFor="modal-layer-color">
              <SelectInput
                id="modal-layer-color"
                value={color}
                options={colorOptions}
                onChange={setColor}
              />
            </FormField>
            <FormField label="Linetype" htmlFor="modal-layer-linetype">
              <SelectInput
                id="modal-layer-linetype"
                value={linetype}
                options={linetypeOptions}
                onChange={setLinetype}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Switch label="Visible" checked={visible} onChange={setVisible} />
            <Checkbox label="Locked" checked={locked} onChange={setLocked} />
          </div>
        </div>
      </Dialog>

      <InfoDialog
        open={active === "info"}
        onClose={close}
        title="Session saved"
        message="Neutral message demo. This dialog carries information only — acknowledge it with OK."
      />

      <ConfirmDialog
        open={active === "confirm"}
        onClose={() => {
          setConfirmOutcome("Cancelled — default tone");
          close();
        }}
        title="Discard changes?"
        message="Default tone demo. Unsaved edits would be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmOutcome("Confirmed — default tone");
          close();
        }}
      />

      <ConfirmDialog
        open={active === "danger"}
        onClose={() => {
          setConfirmOutcome("Cancelled — danger tone");
          close();
        }}
        title="Delete layer?"
        message="Danger tone demo. This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          setConfirmOutcome("Confirmed — danger tone");
          close();
        }}
      />

      <Dialog
        open={active === "progress"}
        onClose={close}
        title="Applying changes"
        description="Non-dismissible demo with simulated progress. ESC and overlay click are locked."
        size="sm"
        dismissible={false}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-center gap-1.5">
            <span
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Applying changes progress"
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--wb-surface-hover)]"
            >
              <span
                aria-hidden
                className="block h-full rounded-full bg-[var(--wb-accent)] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="wb-mono shrink-0 text-[10px] text-[var(--wb-text-muted)]">
              {progress}%
            </span>
          </span>
          <p className="text-[10px] text-[var(--wb-text-disabled)]">
            Simulated demo progress — no real work runs.
          </p>
        </div>
      </Dialog>
    </Panel>
  );
}
