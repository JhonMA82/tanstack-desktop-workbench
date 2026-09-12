import { X } from "lucide-react";
import { useWidgets } from "../../../workbench/widgets";
import { Panel, PanelHeader } from "../primitives/Panel";

/** Chrome around a single widget body: header + close action. */
export function DockPanel({ widgetId }: { widgetId: string }) {
  const { all, hide } = useWidgets();
  const def = all.find((widget) => widget.id === widgetId);
  if (!def) {
    return null;
  }
  const Body = def.component;
  return (
    <Panel title={def.title} className="h-full w-full">
      <PanelHeader
        icon={def.icon}
        title={def.title}
        actions={
          def.closable ? (
            <button
              type="button"
              title={`Close ${def.title}`}
              aria-label={`Close ${def.title}`}
              onClick={() => hide(def.id)}
              className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--wb-text-muted)] hover:bg-[var(--wb-surface-hover)] hover:text-[var(--wb-text)]"
            >
              <X size={12} aria-hidden />
            </button>
          ) : undefined
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Body />
      </div>
    </Panel>
  );
}

/** Looks a widget up by id and renders it with dock chrome. */
export function WidgetHost({ widgetId }: { widgetId: string }) {
  return <DockPanel widgetId={widgetId} />;
}
