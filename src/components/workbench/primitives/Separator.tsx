export function Separator({ vertical }: { vertical?: boolean }) {
  return (
    <div
      aria-hidden
      className={
        vertical
          ? "mx-1 w-px self-stretch bg-[var(--wb-border-subtle)]"
          : "my-1 h-px self-stretch bg-[var(--wb-border-subtle)]"
      }
    />
  );
}
