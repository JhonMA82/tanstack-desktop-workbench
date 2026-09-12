import type { ReactNode } from "react";

const inputClass =
  "h-6 w-full rounded-sm border border-[var(--wb-border)] bg-[var(--wb-background)] px-1.5 text-[11px] text-[var(--wb-text)] placeholder:text-[var(--wb-text-disabled)] focus:border-[var(--wb-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/** Label + hint + error wrapper. Associates the label via htmlFor. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)]"
      >
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      {children}
      {error ? (
        <p
          role="alert"
          className="mt-0.5 text-[10px] text-[var(--wb-status-error)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-0.5 truncate text-[10px] text-[var(--wb-text-disabled)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Dense single-line text input. Controlled; layout via FormField. */
export function TextInput({
  id,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      spellCheck={false}
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

/** Dense numeric input. Controlled; shares the TextInput visuals. */
export function NumberInput({
  id,
  value,
  placeholder,
  disabled,
  min,
  max,
  step,
  onChange,
}: {
  id?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(event.target.value)}
      className={`wb-mono ${inputClass}`}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Dense styled native select. Controlled. */
export function SelectInput({
  id,
  value,
  options,
  disabled,
  onChange,
}: {
  id?: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`cursor-pointer appearance-none pr-6 ${inputClass}`}
      style={{
        backgroundImage: "none",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Dense multi-line textarea. Controlled. */
export function Textarea({
  id,
  value,
  placeholder,
  disabled,
  rows = 3,
  onChange,
}: {
  id?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      id={id}
      value={value}
      spellCheck={false}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-y rounded-sm border border-[var(--wb-border)] bg-[var(--wb-background)] px-1.5 py-1 text-[11px] leading-snug text-[var(--wb-text)] placeholder:text-[var(--wb-text-disabled)] focus:border-[var(--wb-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
