import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

export interface DataColumn<T> {
  key: string;
  header: string;
  /** Right alignment for numerals (rendered in mono). */
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  /** Accessible name for the grid. */
  label: string;
  columns: DataColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectedId?: string;
  onSelect?: (row: T) => void;
  emptyText?: string;
  /** Opt-in right-click per row (menus stay in the caller, never here). */
  onRowContextMenu?: (row: T, event: MouseEvent<HTMLTableRowElement>) => void;
}

/** Dense data grid (~28px rows) with single-select active row state. */
export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  selectedId,
  onSelect,
  emptyText = "No rows",
  onRowContextMenu,
}: DataTableProps<T>) {
  const selectable = onSelect !== undefined;

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    // Inner controls (e.g. eye/lock toggles) handle their own clicks.
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    onSelect?.(row);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(row);
    }
  };

  return (
    <div className="overflow-x-auto rounded-sm border border-[var(--wb-border-subtle)]">
      <table aria-label={label} className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[var(--wb-surface)]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`border-b border-[var(--wb-border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--wb-text-muted)] ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-2 py-2 text-center text-[var(--wb-text-disabled)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = getRowId(row);
              const active = selectedId === id;
              return (
                <tr
                  key={id}
                  aria-selected={selectable ? active : undefined}
                  tabIndex={selectable ? 0 : undefined}
                  onClick={
                    selectable
                      ? (event) => handleRowClick(event, row)
                      : undefined
                  }
                  onKeyDown={
                    selectable
                      ? (event) => handleKeyDown(event, row)
                      : undefined
                  }
                  onContextMenu={
                    onRowContextMenu
                      ? (event) => onRowContextMenu(row, event)
                      : undefined
                  }
                  className={`h-7 border-b border-[var(--wb-border-subtle)] last:border-b-0 ${
                    active
                      ? "bg-[var(--wb-accent)]/15"
                      : "bg-transparent hover:bg-[var(--wb-surface-hover)]/60"
                  } ${selectable ? "cursor-pointer" : ""}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`truncate px-2 py-1 text-[var(--wb-text)] ${
                        column.align === "right"
                          ? "wb-mono text-right"
                          : "text-left"
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
