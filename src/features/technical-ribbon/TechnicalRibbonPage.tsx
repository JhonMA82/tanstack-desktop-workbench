import type { FeatureId } from "../../workbench/types";
import { TechnicalRibbonWorkbench } from "./technicalRibbonLayout";

/** Fullscreen demo: the workbench fills the viewport, no OS window chrome. */
export function TechnicalRibbonPage({ features }: { features?: FeatureId[] }) {
  return (
    <main className="flex h-screen w-screen min-h-0 flex-col overflow-hidden bg-[var(--wb-background)] supports-[height:100dvh]:h-[100dvh]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TechnicalRibbonWorkbench features={features} />
      </div>
    </main>
  );
}
