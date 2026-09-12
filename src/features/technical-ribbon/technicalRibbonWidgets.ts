import {
  Activity,
  Bell,
  Briefcase,
  FolderTree,
  Gauge,
  History,
  Layers,
  SlidersHorizontal,
  Terminal,
} from "lucide-react";
import {
  CommandHistoryWidget,
  ConsoleWidget,
  JobsWidget,
  LayersWidget,
  MeasurementsWidget,
  NavigatorWidget,
  NotificationsWidget,
  ObjectTreeWidget,
} from "../../components/workbench/widgets/DemoWidgets";
import { PropertiesWidget } from "../../components/workbench/widgets/PropertiesWidget";
import { globalWidgets, type WidgetRegistry } from "../../workbench/widgets";

/** Widgets shipped with the technical-ribbon preset. Only properties is visible by default. */
export function registerTechnicalRibbonWidgets(
  registry: WidgetRegistry = globalWidgets,
): void {
  registry.registerWidget({
    id: "properties",
    title: "Properties",
    icon: SlidersHorizontal,
    component: PropertiesWidget,
    defaultPosition: "right",
    defaultSize: { width: 220, height: 600 },
    minSize: { width: 180, height: 300 },
    closable: false,
    resizable: true,
    visible: true,
  });
  registry.registerWidget({
    id: "layers",
    title: "Layers",
    icon: Layers,
    component: LayersWidget,
    defaultPosition: "left",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "objects",
    title: "Object Tree",
    icon: FolderTree,
    component: ObjectTreeWidget,
    defaultPosition: "left",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "console",
    title: "Console",
    icon: Terminal,
    component: ConsoleWidget,
    defaultPosition: "bottom",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "history",
    title: "Command History",
    icon: History,
    component: CommandHistoryWidget,
    defaultPosition: "bottom",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "navigator",
    title: "Navigator",
    icon: Gauge,
    component: NavigatorWidget,
    defaultPosition: "right",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "measurements",
    title: "Measurements",
    icon: Activity,
    component: MeasurementsWidget,
    defaultPosition: "right",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "jobs",
    title: "Jobs",
    icon: Briefcase,
    component: JobsWidget,
    defaultPosition: "bottom",
    closable: true,
    visible: false,
  });
  registry.registerWidget({
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    component: NotificationsWidget,
    defaultPosition: "right",
    closable: true,
    visible: false,
  });
}
