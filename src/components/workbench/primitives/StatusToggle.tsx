/** Small on/off pill used by the status bar. */
export function StatusToggle({
  label,
  active,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
        active
          ? "bg-white text-[var(--wb-accent)]"
          : "text-white/75 hover:bg-black/15 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
