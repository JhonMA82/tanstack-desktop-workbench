/** Single-line command input. Behavior (history, shortcuts) lives in the owner. */
export function CommandInput({
  value,
  placeholder,
  onChange,
  onSubmit,
  onKeyDown,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      spellCheck={false}
      autoComplete="off"
      placeholder={placeholder}
      aria-label="Command input"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onSubmit?.();
        }
        onKeyDown?.(event);
      }}
      className="wb-mono min-w-0 flex-1 bg-transparent text-[11px] text-[var(--wb-text)] placeholder:text-[var(--wb-text-disabled)] focus:outline-none"
    />
  );
}
