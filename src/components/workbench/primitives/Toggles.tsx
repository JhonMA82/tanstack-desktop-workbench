import { useId } from "react";
import type { SelectOption } from "./Fields";

/** Re-exported so showcase sections import toggle options from one place. */
export type { SelectOption };

/** Dense checkbox with an associated label. Controlled. */
export function Checkbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--wb-text)] ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--wb-accent)] disabled:cursor-not-allowed"
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

export interface RadioOption {
  value: string;
  label: string;
}

/** Dense radio group. Controlled single-select via fieldset + legend. */
export function RadioGroup({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: RadioOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-0.5 p-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--wb-text)] ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--wb-accent)] disabled:cursor-not-allowed"
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Dense toggle switch. Button with role=switch for keyboard support. */
export function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex cursor-pointer items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={`flex h-4 w-7 shrink-0 items-center rounded-full border px-0.5 transition-colors ${
          checked
            ? "justify-end border-[var(--wb-accent)] bg-[var(--wb-accent)]"
            : "justify-start border-[var(--wb-border)] bg-[var(--wb-background)] group-hover:border-[var(--wb-text-disabled)]"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${checked ? "bg-[var(--wb-accent-contrast)]" : "bg-[var(--wb-text-muted)]"}`}
        />
      </span>
      <span className="truncate text-[11px] text-[var(--wb-text)]">
        {label}
      </span>
    </button>
  );
}

/** Dense slider with a mono value readout. Controlled. */
export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled,
  format,
  onChange,
}: {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const text = format ? format(value) : String(value);
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className="wb-mono shrink-0 text-[11px] text-[var(--wb-text)]"
        >
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-valuetext={text}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-4 w-full cursor-pointer accent-[var(--wb-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
