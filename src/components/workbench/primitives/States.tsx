import { Inbox, type LucideIcon, TriangleAlert } from "lucide-react";
import { WbButton } from "./Buttons";

const centerClass = "flex flex-col items-center gap-1.5 px-4 py-6 text-center";

const titleClass = "text-[11px] font-semibold text-[var(--wb-text)]";

const messageClass =
  "max-w-60 text-[11px] leading-snug text-[var(--wb-text-muted)]";

/** Compact placeholder for lists and panels with nothing to show. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`${centerClass} ${className ?? ""}`}>
      <Icon size={20} aria-hidden className="text-[var(--wb-text-disabled)]" />
      <p className={titleClass}>{title}</p>
      {message ? <p className={messageClass}>{message}</p> : null}
      {actionLabel && onAction ? (
        <WbButton size="small" onClick={onAction}>
          {actionLabel}
        </WbButton>
      ) : null}
    </div>
  );
}

/** Pulsing placeholder blocks. Pairs with LoadingState or stands alone. */
export function Skeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  const count = Math.max(0, Math.floor(rows));
  // Static decorative blocks: descriptors carry stable ids so the list
  // never depends on the map index for keys (rows never reorder).
  const blocks = Array.from({ length: count }, (_, index) => ({
    id: `skeleton-block-${index}`,
    width: `${100 - (index % 3) * 18}%`,
  }));
  return (
    <div aria-hidden className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {blocks.map((block) => (
        <div
          key={block.id}
          className="h-2.5 animate-pulse rounded-sm bg-[var(--wb-surface-hover)]"
          style={{ width: block.width }}
        />
      ))}
    </div>
  );
}

/** CSS-only accent spinner plus optional skeleton rows. */
export function LoadingState({
  label = "Loading…",
  rows = 0,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`${centerClass} ${className ?? ""}`}>
      <span
        role="status"
        aria-label={label}
        className="flex items-center gap-2"
      >
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--wb-border)] border-t-[var(--wb-accent)]"
        />
        <span className="text-[11px] text-[var(--wb-text-muted)]">{label}</span>
      </span>
      {rows > 0 ? <Skeleton rows={rows} className="w-full max-w-60" /> : null}
    </div>
  );
}

/**
 * Compact failure notice with a retry action. Shows the message only,
 * never stack traces.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  error,
  retryLabel = "Retry",
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  error?: Error | string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const detail = message ?? (error instanceof Error ? error.message : error);
  return (
    <div className={`${centerClass} ${className ?? ""}`}>
      <TriangleAlert
        size={20}
        aria-hidden
        className="text-[var(--wb-status-error)]"
      />
      <p className={titleClass}>{title}</p>
      {detail ? <p className={messageClass}>{detail}</p> : null}
      {onRetry ? (
        <WbButton size="small" onClick={onRetry}>
          {retryLabel}
        </WbButton>
      ) : null}
    </div>
  );
}
