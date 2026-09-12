import { useEffect, useRef, useState } from "react";
import { WbButton } from "../../components/workbench/primitives/Buttons";
import {
  Panel,
  PanelHeader,
} from "../../components/workbench/primitives/Panel";
import { PropertyRow } from "../../components/workbench/primitives/PropertyRow";
import { ToastStack } from "../../components/workbench/shell/ToastStack";
import type { PanZoomState } from "../../components/workbench/viewport/usePanZoom";
import { Viewport } from "../../components/workbench/viewport/Viewport";
import { CommandProvider, useCommands } from "../../workbench/commands";
import {
  ToastsProvider,
  type ToastTone,
  useToasts,
} from "../../workbench/notifications";
import { StatusProvider } from "../../workbench/status";

/** Demo command run by the toast action button (no inline domain logic). */
const DEMO_ACTION_COMMAND = "demo.toast-action";

const toneButtons: Array<{
  tone: ToastTone;
  title: string;
  message: string;
}> = [
  { tone: "info", title: "Snap enabled", message: "Endpoint snap at 5px." },
  { tone: "success", title: "Plot finished", message: "Layout1 sent to PDF." },
  {
    tone: "warning",
    title: "Units mismatch",
    message: "Drawing is in inches.",
  },
  {
    tone: "error",
    title: "Export failed",
    message: "Disk full. Sticky until dismissed.",
  },
];

function ToastDemo() {
  const { notify } = useToasts();
  const commands = useCommands();
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  useEffect(() => {
    if (!commands.has(DEMO_ACTION_COMMAND)) {
      commands.registerCommand(
        DEMO_ACTION_COMMAND,
        () => {
          notifyRef.current({ title: "Layers shown", tone: "success" });
        },
        { label: "Demo toast action" },
      );
    }
  }, [commands]);

  return (
    <div className="flex flex-wrap gap-1.5 p-2">
      {toneButtons.map((tone) => (
        <WbButton
          key={tone.tone}
          size="small"
          onClick={() =>
            notify({
              title: tone.title,
              message: tone.message,
              tone: tone.tone,
            })
          }
        >
          {tone.tone}
        </WbButton>
      ))}
      <WbButton
        size="small"
        variant="primary"
        onClick={() =>
          notify({
            title: "Review layers",
            message: "Two layers are hidden.",
            tone: "info",
            action: { label: "Show layers", command: DEMO_ACTION_COMMAND },
          })
        }
      >
        with action
      </WbButton>
    </div>
  );
}

function PanZoomDemo() {
  const [transform, setTransform] = useState<PanZoomState>({
    x: 0,
    y: 0,
    k: 1,
  });

  return (
    <div className="p-2">
      <div className="flex h-56 flex-col overflow-hidden rounded-sm border border-[var(--wb-border-subtle)]">
        <Viewport
          interactive
          viewLabel="Demo"
          styleLabel="Pan/Zoom"
          onTransformChange={setTransform}
        >
          <svg
            width="600"
            height="300"
            viewBox="0 0 600 300"
            role="presentation"
            className="absolute left-10 top-10"
          >
            <rect
              x="20"
              y="20"
              width="200"
              height="120"
              fill="none"
              stroke="var(--wb-accent)"
              strokeWidth="2"
            />
            <circle
              cx="360"
              cy="110"
              r="60"
              fill="none"
              stroke="var(--wb-axis-x)"
              strokeWidth="2"
            />
            <line
              x1="20"
              y1="200"
              x2="560"
              y2="200"
              stroke="var(--wb-axis-y)"
              strokeWidth="1.5"
              strokeDasharray="8 4"
            />
          </svg>
        </Viewport>
      </div>
      <div aria-live="polite" className="mt-1.5 flex gap-4">
        <PropertyRow label="x" mono>
          {transform.x.toFixed(1)}
        </PropertyRow>
        <PropertyRow label="y" mono>
          {transform.y.toFixed(1)}
        </PropertyRow>
        <PropertyRow label="k" mono>
          {`${Math.round(transform.k * 100)}%`}
        </PropertyRow>
      </div>
      <p className="mt-1 text-[11px] text-[var(--wb-text-muted)]">
        Drag to pan, scroll to zoom toward the cursor, focus + `+`/`-`/`0` for
        keyboard zoom.
      </p>
    </div>
  );
}

/**
 * Toasts + pan/zoom interactive proof. Self-provisioned providers: the
 * `/demo/controls` route renders outside WorkbenchShell.
 */
export function InteractionPanel() {
  return (
    <CommandProvider>
      <StatusProvider>
        <ToastsProvider>
          <Panel>
            <PanelHeader title="Toasts" />
            <ToastDemo />
          </Panel>
          <Panel>
            <PanelHeader title="Pan & zoom viewport" />
            <PanZoomDemo />
          </Panel>
          <ToastStack />
        </ToastsProvider>
      </StatusProvider>
    </CommandProvider>
  );
}
