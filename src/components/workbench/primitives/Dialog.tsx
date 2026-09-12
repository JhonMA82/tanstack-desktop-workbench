import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FormActions, WbButton } from "./Buttons";

export type DialogSize = "sm" | "md" | "lg";
export type DialogInitialFocus = "auto" | "panel";
export type ConfirmTone = "default" | "danger";

const sizeClass: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  /** ESC + overlay click. False hides the X and locks the dialog. Default true. */
  dismissible?: boolean;
  /** "auto" focuses the first focusable element, "panel" the panel itself. Default "auto". */
  initialFocus?: DialogInitialFocus;
}

/** Generic modal dialog. Overlay + centered panel rendered via portal. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
  initialFocus = "auto",
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target =
      initialFocusRef.current === "panel"
        ? panel
        : (panel?.querySelector<HTMLElement>(focusableSelector) ?? panel);
    target?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissibleRef.current) {
        onCloseRef.current();
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (event.target === overlayRef.current && dismissibleRef.current) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--wb-backdrop) 72%, transparent)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded border border-[var(--wb-border)] bg-[var(--wb-surface)] text-[var(--wb-text)] shadow-xl focus:outline-none ${sizeClass[size]}`}
      >
        <header className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[var(--wb-border-subtle)] px-2">
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wide"
          >
            {title}
          </h2>
          {dismissible ? (
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label={`Close ${title}`}
              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[var(--wb-text-muted)] transition-colors hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)] focus-visible:outline-2 focus-visible:outline-[var(--wb-accent)]"
            >
              <X size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </header>
        {description ? (
          <p
            id={descriptionId}
            className="shrink-0 px-2 pt-1.5 text-[11px] text-[var(--wb-text-muted)]"
          >
            {description}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 text-[11px]">
          {children}
        </div>
        {footer ? (
          <footer className="shrink-0 border-t border-[var(--wb-border-subtle)] px-2 py-1.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Confirm/cancel dialog with default or danger tone. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <FormActions>
          <WbButton variant="ghost" size="small" onClick={onClose}>
            {cancelLabel}
          </WbButton>
          <WbButton
            variant={tone === "danger" ? "danger" : "primary"}
            size="small"
            onClick={onConfirm}
          >
            {confirmLabel}
          </WbButton>
        </FormActions>
      }
    >
      <p className="text-[11px] leading-snug">{message}</p>
    </Dialog>
  );
}

/** Single-action informative dialog. */
export function InfoDialog({
  open,
  onClose,
  title,
  message,
  actionLabel = "OK",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionLabel?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <FormActions>
          <WbButton variant="primary" size="small" onClick={onClose}>
            {actionLabel}
          </WbButton>
        </FormActions>
      }
    >
      <p className="text-[11px] leading-snug">{message}</p>
    </Dialog>
  );
}
