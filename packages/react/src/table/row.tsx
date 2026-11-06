import { useMemo } from "react";
import type { PointerEvent, ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import type { DensedashEvent } from "../merge-props.js";
import { rowIndex, useRowContext, useTreeContext } from "../tree/context.js";
import type { TreeSnapshot } from "../tree/handle.js";
import { Row as TreeRow, Toggle as TreeToggle } from "../tree/row.js";
import type { RowProps as TreeRowProps, ToggleProps } from "../tree/row.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import type { ColumnAlign, TableColumnDef } from "./columns.js";

export type { RowState, ToggleProps, ToggleState } from "../tree/row.js";
export type RowProps<T> = TreeRowProps<T>;

// The pointer highlights a row only when it moves into the row. A move without movement (sent
// after scrolling or re-rendering under a resting pointer), or one that starts inside the
// row's box (the row came under the pointer, as after a sort, scroll or insertion), keeps the
// highlight where the keys or the app put it.
function enteredRow(event: PointerEvent<HTMLDivElement>): boolean {
  const { movementX, movementY } = event;
  if (movementX === 0 && movementY === 0) return false;
  const x = event.clientX - movementX;
  const y = event.clientY - movementY;
  const box = event.currentTarget.getBoundingClientRect();
  return x < box.left || x >= box.right || y < box.top || y >= box.bottom;
}

/**
 * One visible row: the tree's row part (highlight, selection, pointer handling) as a grid
 * `row`. Its `aria-rowindex` counts the header row. The index has its own subscription, so an
 * insertion above re-renders this part but not the row's cells. The pointer highlights the row
 * when it moves into it, not when sorting, scrolling or an insertion brings the row under a
 * pointer that is still or moving within one row's height.
 */
export function Row({ row, onPointerMove, ...props }: RowProps<unknown>): ReactElement {
  const { handle } = useTreeContext("<Table.Row>");
  const id = row.id;
  const select = useMemo(() => (state: TreeSnapshot<unknown>) => rowIndex(state, id), [id]);
  const index = useStore(handle.state, select);
  // Skips the row part's own handler, as a consumer's `preventDensedashHandler()` does, and
  // passes the event on, so the consumer's handler can still skip it too.
  const onMove = (event: DensedashEvent<PointerEvent<HTMLDivElement>>) => {
    if (!enteredRow(event)) event.preventDensedashHandler();
    onPointerMove?.(event);
  };
  return (
    <TreeRow
      data-slot="table-row"
      aria-rowindex={index + 2}
      {...props}
      onPointerMove={onMove}
      row={row}
    />
  );
}

/** The row's expand/collapse button; place it in the first cell of nested rows. */
export function Toggle(props: ToggleProps): ReactElement {
  return <TreeToggle data-slot="table-toggle" {...props} />;
}

export interface CellState {
  readonly align: ColumnAlign;
  /** The column's values are numbers. */
  readonly numeric: boolean;
  /** The value is missing (or not a number in a numeric column), so the cell shows nothing. */
  readonly empty: boolean;
}

export interface CellProps<T> extends ElementAttributes<HTMLDivElement>, PartProps<CellState> {
  readonly column: TableColumnDef<T>;
  /** Replaces the formatted value. */
  readonly children?: ReactNode;
}

// TanStack's row reads (and caches) the column accessor's value, as its sorting does.
interface ValueRow {
  getValue(columnId: string): unknown;
}

function useCell<T>(column: TableColumnDef<T>) {
  const { row } = useRowContext("<Table.Cell>");
  const value = (row as unknown as ValueRow).getValue(column.id);
  const { meta } = column;
  return {
    value: value === undefined ? null : meta.render(value, row.original as T),
    state: {
      align: meta.align,
      numeric: meta.numeric,
      empty: value === undefined,
    } satisfies CellState,
  };
}

/** One `gridcell`: the column's value for the row, formatted, or empty when it is missing. */
export function Cell<T>({
  column,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: CellProps<T>): ReactElement {
  const { value, state } = useCell(column);
  return useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        { "data-slot": "table-cell", role: "gridcell", children: children ?? value },
        props,
      ),
      className,
      style,
    },
  });
}

/**
 * A cell's formatted value alone, for a `<Table.Cell>` whose children add content such as the
 * toggle. It formats exactly as the cell would: the row's TanStack value, empty when missing,
 * through the column's `format`.
 */
export function Value<T>({ column }: { readonly column: TableColumnDef<T> }): ReactNode {
  return useCell(column).value;
}
