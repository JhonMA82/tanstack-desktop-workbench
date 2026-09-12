import { Calculator, MousePointer2 } from "lucide-react";
import { PanelSection } from "../primitives/Panel";
import { PropertyRow } from "../primitives/PropertyRow";

/** Featured inspector widget. Static demo content; no CAD engine behind it. */
export function PropertiesWidget() {
  return (
    <div>
      <PanelSection title="General">
        <PropertyRow label="Color">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--wb-border)] bg-[var(--wb-text-muted)]"
            />
            ByLayer
          </span>
        </PropertyRow>
        <PropertyRow label="Layer" mono>
          0 - Default
        </PropertyRow>
        <PropertyRow label="Linetype">ByLayer</PropertyRow>
      </PanelSection>
      <PanelSection title="Geometry">
        <div className="grid grid-cols-2 gap-x-3">
          <PropertyRow label="Start X" mono>
            120.000
          </PropertyRow>
          <PropertyRow label="Start Y" mono>
            -80.000
          </PropertyRow>
          <PropertyRow label="End X" mono>
            40.000
          </PropertyRow>
          <PropertyRow label="End Y" mono>
            20.000
          </PropertyRow>
          <PropertyRow label="Length" mono>
            189.73
          </PropertyRow>
          <PropertyRow label="Angle" mono>
            38°
          </PropertyRow>
        </div>
      </PanelSection>
      <div className="px-2 py-1.5">
        <p className="rounded-sm border border-[var(--wb-border-subtle)] bg-[var(--wb-background)] px-2 py-1.5 text-[11px] leading-snug text-[var(--wb-text-muted)]">
          1 object selected. Edit fields to update the selection preview.
        </p>
      </div>
      <div className="flex gap-1.5 px-2 pb-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-[var(--wb-border)] bg-[var(--wb-surface-hover)] px-2 py-1 text-[11px] text-[var(--wb-text)] transition-colors hover:bg-[var(--wb-border)]"
        >
          <Calculator size={13} aria-hidden />
          QuickCalc
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[var(--wb-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--wb-accent-contrast)] transition-colors hover:bg-[var(--wb-accent-hover)]"
        >
          <MousePointer2 size={13} aria-hidden />
          Select
        </button>
      </div>
    </div>
  );
}
