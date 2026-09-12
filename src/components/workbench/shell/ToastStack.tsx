import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCommands } from "../../../workbench/commands";
import {
  type Toast,
  type ToastTone,
  useToasts,
} from "../../../workbench/notifications";
import { WbButton } from "../primitives/Buttons";

const toneBar: Record<ToastTone, string> = {
  info: "bg-[var(--wb-accent)]",
  success: "bg-[var(--wb-status-success)]",
  warning: "bg-[var(--wb-status-warning)]",
  error: "bg-[var(--wb-status-error)]",
};

function toastRole(tone: ToastTone): "status" | "alert" {
  return tone === "error" || tone === "warning" ? "alert" : "status";
}

function ToastCard({ toast }: { toast: Toast }) {
  const { dismiss, pause, resume } = useToasts();
  const commands = useCommands();

  return (
    // Hover pauses the provider-owned auto-dismiss timer; the dismiss
    // button keeps the card fully keyboard-operable.
    // biome-ignore lint/a11y/noStaticElementInteractions: pause-on-hover requires pointer handlers on the card.
    <div
      role={toastRole(toast.tone)}
      aria-live="polite"
      onMouseEnter={() => pause(toast.id)}
      onMouseLeave={() => resume(toast.id)}
      className="pointer-events-auto flex w-72 overflow-hidden rounded-md border border-[var(--wb-border)] bg-[var(--wb-surface-raised)] shadow-lg"
    >
      <span aria-hidden className={`w-1 shrink-0 ${toneBar[toast.tone]}`} />
      <div className="min-w-0 flex-1 px-2.5 py-2">
        <p className="truncate text-[12px] font-semibold text-[var(--wb-text)]">
          {toast.title}
        </p>
        {toast.message ? (
          <p className="mt-0.5 break-words text-[11px] leading-snug text-[var(--wb-text-muted)]">
            {toast.message}
          </p>
        ) : null}
        {toast.action ? (
          <div className="mt-1.5">
            <WbButton
              size="small"
              variant="ghost"
              onClick={() => {
                commands.execute(
                  toast.action?.command ?? "",
                  toast.action?.args,
                );
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </WbButton>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={`Dismiss ${toast.title}`}
        onClick={() => dismiss(toast.id)}
        className="shrink-0 self-start p-1.5 text-[var(--wb-text-muted)] transition-colors hover:text-[var(--wb-text)]"
      >
        <X size={13} aria-hidden />
      </button>
    </div>
  );
}

/**
 * Global toast stack. Portalled bottom-right above the status bar.
 * Mount once inside WorkbenchShell; all presets inherit it.
 */
export function ToastStack() {
  const { toasts } = useToasts();
  if (toasts.length === 0) {
    return null;
  }
  return createPortal(
    <div
      role="log"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-10 right-3 z-50 flex flex-col items-end gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
