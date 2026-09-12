import {
  FormField,
  NumberInput,
  SelectInput,
  TextInput,
} from "../../components/workbench/primitives/Fields";
import { PropertyRow } from "../../components/workbench/primitives/PropertyRow";
import { Checkbox } from "../../components/workbench/primitives/Toggles";
import { SETUP_ENVIRONMENTS, type SetupDemoData } from "./setupDemo";

export interface StepBodyProps {
  data: SetupDemoData;
  onChange: (patch: Partial<SetupDemoData>) => void;
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-[var(--wb-text)]">
        {title}
      </h2>
      <p className="mt-0.5 text-[11px] text-[var(--wb-text-muted)]">{hint}</p>
    </div>
  );
}

/**
 * Step bodies prevent implicit form submits: every form has no submit
 * button and calls preventDefault on submit, so Enter in a field never
 * advances the wizard (navigation is explicit Back/Next only).
 */
function StepForm({ children }: { children: React.ReactNode }) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-2.5"
    >
      {children}
    </form>
  );
}

/** Step 1 (Connect): workspace name plus workspace address. Demo only. */
export function ConnectStep({ data, onChange }: StepBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeading
        title="Connect"
        hint="Name this workspace and point it at a workspace address."
      />
      <StepForm>
        <FormField label="Workspace name" htmlFor="setup-name" required>
          <TextInput
            id="setup-name"
            value={data.displayName}
            placeholder="e.g. Field laptop"
            onChange={(displayName) => onChange({ displayName })}
          />
        </FormField>
        <FormField
          label="Workspace address"
          htmlFor="setup-url"
          hint="Demo only: nothing connects anywhere."
          required
        >
          <TextInput
            id="setup-url"
            value={data.workspaceUrl}
            placeholder="https://example.local"
            onChange={(workspaceUrl) => onChange({ workspaceUrl })}
          />
        </FormField>
      </StepForm>
    </div>
  );
}

/** Step 2 (Configure): environment plus retention window. Demo only. */
export function ConfigureStep({ data, onChange }: StepBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeading
        title="Configure"
        hint="Pick an environment and how long to keep demo history."
      />
      <StepForm>
        <FormField label="Environment" htmlFor="setup-environment" required>
          <SelectInput
            id="setup-environment"
            value={data.environment}
            options={[...SETUP_ENVIRONMENTS]}
            onChange={(environment) => onChange({ environment })}
          />
        </FormField>
        <FormField
          label="History retention"
          htmlFor="setup-retention"
          hint="Whole days, 1 to 90."
          required
        >
          <NumberInput
            id="setup-retention"
            value={data.retentionDays}
            min={1}
            max={90}
            step={1}
            onChange={(retentionDays) => onChange({ retentionDays })}
          />
        </FormField>
      </StepForm>
    </div>
  );
}

/** Step 3 (Review): read-only summary gated on an explicit confirmation. */
export function ReviewStep({ data, onChange }: StepBodyProps) {
  const environment =
    SETUP_ENVIRONMENTS.find((option) => option.value === data.environment)
      ?.label ?? data.environment;
  return (
    <div className="flex flex-col gap-3">
      <StepHeading
        title="Review"
        hint="Check the demo details before finishing."
      />
      <div className="rounded-md border border-[var(--wb-border)] bg-[var(--wb-surface)] px-2.5 py-1.5">
        <PropertyRow label="Name">{data.displayName}</PropertyRow>
        <PropertyRow label="Address" mono>
          {data.workspaceUrl}
        </PropertyRow>
        <PropertyRow label="Environment">{environment}</PropertyRow>
        <PropertyRow label="Retention" mono>
          {data.retentionDays} days
        </PropertyRow>
      </div>
      <Checkbox
        label="These details look correct"
        checked={data.confirmed}
        onChange={(confirmed) => onChange({ confirmed })}
      />
    </div>
  );
}
