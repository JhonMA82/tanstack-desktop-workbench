import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  /** Id of a registered command; executed via the command registry. */
  command: string;
  args?: unknown;
}

export interface NotifyInput {
  title: string;
  message?: string;
  tone: ToastTone;
  /** Override the per-tone default. `null` (or error default) = sticky. */
  durationMs?: number | null;
  action?: ToastAction;
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
  action?: ToastAction;
  /** Resolved auto-dismiss delay; `null` means sticky until dismissed. */
  durationMs: number | null;
  paused: boolean;
  remainingMs: number | null;
  expiresAt: number | null;
}

/** Max visible toasts; oldest entries are pruned on overflow. */
export const MAX_TOASTS = 4;

const DEFAULT_DURATION_MS: Record<ToastTone, number | null> = {
  info: 5000,
  success: 5000,
  warning: 5000,
  error: null,
};

let toastSeq = 0;

/** Resolve the effective auto-dismiss delay for a notify input. */
export function resolveDurationMs(input: NotifyInput): number | null {
  if (input.durationMs !== undefined) {
    return input.durationMs;
  }
  return DEFAULT_DURATION_MS[input.tone];
}

export function createToast(input: NotifyInput, now: number): Toast {
  toastSeq += 1;
  const durationMs = resolveDurationMs(input);
  return {
    id: `toast-${now}-${toastSeq}`,
    title: input.title,
    message: input.message,
    tone: input.tone,
    action: input.action,
    durationMs,
    paused: false,
    remainingMs: null,
    expiresAt: durationMs === null ? null : now + durationMs,
  };
}

export type ToastsState = Toast[];

export type ToastsEvent =
  | { type: "enqueue"; toast: Toast }
  | { type: "dismiss"; id: string }
  | { type: "expire"; id: string }
  | { type: "pause"; id: string; now: number }
  | { type: "resume"; id: string; now: number }
  | { type: "clear" };

/**
 * Pure toast stack reducer. Enqueue prunes the oldest entries past
 * MAX_TOASTS; pause freezes expiry bookkeeping, resume re-arms it.
 */
export function toastsReducer(
  state: ToastsState,
  event: ToastsEvent,
): ToastsState {
  switch (event.type) {
    case "enqueue": {
      const next = [...state, event.toast];
      return next.length > MAX_TOASTS
        ? next.slice(next.length - MAX_TOASTS)
        : next;
    }
    case "dismiss":
    case "expire":
      return state.filter((toast) => toast.id !== event.id);
    case "pause":
      return state.map((toast) => {
        if (toast.id !== event.id || toast.paused || toast.expiresAt === null) {
          return toast;
        }
        return {
          ...toast,
          paused: true,
          remainingMs: Math.max(0, toast.expiresAt - event.now),
          expiresAt: null,
        };
      });
    case "resume":
      return state.map((toast) => {
        if (toast.id !== event.id || !toast.paused) {
          return toast;
        }
        const remaining = toast.remainingMs ?? toast.durationMs;
        return {
          ...toast,
          paused: false,
          remainingMs: null,
          expiresAt: remaining === null ? null : event.now + remaining,
        };
      });
    case "clear":
      return [];
  }
}

export interface ToastsApi {
  toasts: Toast[];
  notify: (input: NotifyInput) => string;
  dismiss: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  clear: () => void;
}

const ToastsContext = createContext<ToastsApi | null>(null);

/**
 * Global toast dispatch. Mount once (inside WorkbenchShell) so every
 * preset inherits it. Expiry timers live here; the stack UI only
 * reports hover via pause/resume.
 */
export function ToastsProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastsReducer, []);

  const notify = useCallback((input: NotifyInput): string => {
    const toast = createToast(input, Date.now());
    dispatch({ type: "enqueue", toast });
    return toast.id;
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "dismiss", id });
  }, []);
  const pause = useCallback((id: string) => {
    dispatch({ type: "pause", id, now: Date.now() });
  }, []);
  const resume = useCallback((id: string) => {
    dispatch({ type: "resume", id, now: Date.now() });
  }, []);
  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  // One timeout per expirable, unpaused toast. Pausing clears the
  // timeout (expiresAt is null); resuming re-arms it with the remainder.
  useEffect(() => {
    const timers: number[] = [];
    for (const toast of toasts) {
      if (toast.expiresAt === null || toast.paused) {
        continue;
      }
      const delay = Math.max(0, toast.expiresAt - Date.now());
      const timer = window.setTimeout(() => {
        dispatch({ type: "expire", id: toast.id });
      }, delay);
      timers.push(timer);
    }
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [toasts]);

  const value = useMemo<ToastsApi>(
    () => ({ toasts, notify, dismiss, pause, resume, clear }),
    [toasts, notify, dismiss, pause, resume, clear],
  );
  return (
    <ToastsContext.Provider value={value}>{children}</ToastsContext.Provider>
  );
}

export function useToasts(): ToastsApi {
  const api = useContext(ToastsContext);
  if (!api) {
    throw new Error("useToasts must be used within a ToastsProvider");
  }
  return api;
}

/** Null outside the provider; lets widgets degrade to static content. */
export function useToastsOptional(): ToastsApi | null {
  return useContext(ToastsContext);
}
