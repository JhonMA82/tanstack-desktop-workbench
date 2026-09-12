import { globalStatus, type StatusRegistry } from "../../workbench/status";

/** Drawing aids for the technical-ribbon preset. GRID drives ViewportGrid visibility. */
export function registerTechnicalRibbonStatus(
  registry: StatusRegistry = globalStatus,
): void {
  registry.registerStatusItem({
    id: "grid",
    label: "GRID",
    kind: "toggle",
    active: true,
    shortcut: "G",
  });
  registry.registerStatusItem({
    id: "ortho",
    label: "ORTHO",
    kind: "toggle",
    active: false,
    shortcut: "F8",
  });
  registry.registerStatusItem({
    id: "osnap",
    label: "OSNAP",
    kind: "toggle",
    active: true,
    shortcut: "F3",
  });
}
