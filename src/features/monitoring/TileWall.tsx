import { StatTile } from "../../components/workbench/widgets/StatTile";
import {
  type DemoTile,
  formatTileValue,
  tileHistory,
  tileToneAt,
} from "./monitoringDemo";

interface TileWallProps {
  tiles: DemoTile[];
  tick: number;
  /** Null means all sources; set by the source nav filter. */
  sourceId: string | null;
}

/**
 * Central responsive tile grid. Observe-only: tiles render live demo
 * values, never controls.
 */
export function TileWall({ tiles, tick, sourceId }: TileWallProps) {
  const visible =
    sourceId === null
      ? tiles
      : tiles.filter((tile) => tile.sourceId === sourceId);
  if (visible.length === 0) {
    return (
      <p className="p-4 text-[12px] text-[var(--wb-text-disabled)]">
        No tiles for this source.
      </p>
    );
  }
  return (
    <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2 xl:grid-cols-3">
      {visible.map((tile) => (
        <StatTile
          key={tile.id}
          label={tile.label}
          value={formatTileValue(tile, tick)}
          unit={tile.unit}
          tone={tileToneAt(tile, tick)}
          sparkline={tileHistory(tile, tick)}
        />
      ))}
    </div>
  );
}
