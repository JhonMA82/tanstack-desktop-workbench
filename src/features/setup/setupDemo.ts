/**
 * Setup demo model: neutral placeholder data for the setup wizard flow.
 * Demo data only: no device, backend, or provisioning logic lives here.
 * Pure validation helpers gate each step's Next button.
 */

export interface SetupDemoData {
  /** Step 1 (Connect): human-readable workspace name. */
  displayName: string;
  /** Step 1 (Connect): workspace address; must look like an http(s) URL. */
  workspaceUrl: string;
  /** Step 2 (Configure): one of SETUP_ENVIRONMENTS. */
  environment: string;
  /** Step 2 (Configure): raw retention input; valid when an integer 1-90. */
  retentionDays: string;
  /** Step 3 (Review): the reviewer confirmed the summary. */
  confirmed: boolean;
}

export const SETUP_STEP_META = [
  { id: "connect", title: "Connect", description: "Name and address" },
  { id: "configure", title: "Configure", description: "Environment" },
  { id: "review", title: "Review", description: "Confirm details" },
  { id: "done", title: "Done", description: "Ready to start" },
] as const;

export const SETUP_ENVIRONMENTS = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
] as const;

export const EMPTY_SETUP_DATA: SetupDemoData = {
  displayName: "",
  workspaceUrl: "",
  environment: "development",
  retentionDays: "30",
  confirmed: false,
};

export interface StepGate {
  canProceed: boolean;
  disabledReason?: string;
}

/** Step 1 gate: a non-empty name plus an http(s) workspace address. */
export function validateConnect(data: SetupDemoData): StepGate {
  if (data.displayName.trim().length === 0) {
    return { canProceed: false, disabledReason: "Enter a workspace name." };
  }
  if (!/^https?:\/\/.+\..+/.test(data.workspaceUrl.trim())) {
    return {
      canProceed: false,
      disabledReason: "Enter a workspace address like https://example.local.",
    };
  }
  return { canProceed: true };
}

/** Step 2 gate: a known environment plus retention of 1-90 days. */
export function validateConfigure(data: SetupDemoData): StepGate {
  const known = SETUP_ENVIRONMENTS.some(
    (option) => option.value === data.environment,
  );
  if (!known) {
    return { canProceed: false, disabledReason: "Pick an environment." };
  }
  if (!/^\d+$/.test(data.retentionDays.trim())) {
    return {
      canProceed: false,
      disabledReason: "Retention must be a whole number of days.",
    };
  }
  const days = Number(data.retentionDays.trim());
  if (days < 1 || days > 90) {
    return {
      canProceed: false,
      disabledReason: "Retention must be between 1 and 90 days.",
    };
  }
  return { canProceed: true };
}

/** Step 3 gate: the reviewer confirmed the summary. */
export function validateReview(data: SetupDemoData): StepGate {
  if (!data.confirmed) {
    return {
      canProceed: false,
      disabledReason: "Confirm the details to continue.",
    };
  }
  return { canProceed: true };
}
