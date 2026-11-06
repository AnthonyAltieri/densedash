import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
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

/**
 * One visible row: the tree's row part (highlight, selection, pointer handling) as a grid
 * `row`. Its `aria-rowindex` counts the header row. The index has its own subscription, so an
 * insertion above re-renders this part but not the row's cells.
 */
export function Row({ row, ...props }: RowProps<unknown>): ReactElement {
  const { handle } = useTreeContext("<Table.Row>");
  const id = row.id;
  const select = useMemo(() => (state: TreeSnapshot<unknown>) => rowIndex(state, id), [id]);
  const index = useStore(handle.state, select);
  return <TreeRow data-slot="table-row" aria-rowindex={index + 2} {...props} row={row} />;
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
