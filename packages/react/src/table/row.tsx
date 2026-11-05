import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import type { TreeSnapshot } from "@densedash/core";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { rowIndex, useRowContext, useTreeContext } from "../tree/context.js";
import { Row as TreeRow, Toggle as TreeToggle } from "../tree/row.js";
import type { RowProps as TreeRowProps, ToggleProps } from "../tree/row.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import { columnAlign, presentValue } from "./columns.js";
import type { Column, ColumnAlign } from "./columns.js";
import { useTableContext } from "./context.js";

export type { RowState, ToggleProps, ToggleState } from "../tree/row.js";
export type RowProps<T> = TreeRowProps<T>;

/**
 * One visible row: the tree's row part (highlight, selection, pointer handling) as a grid
 * `row`. Its `aria-rowindex` counts the header row. The index has its own subscription, so an
 * insertion above re-renders this part but not the row's cells.
 */
export function Row({ row, ...props }: RowProps<unknown>): ReactElement {
  const { handle } = useTreeContext("<Table.Row>");
  const key = row.key;
  const select = useMemo(() => (state: TreeSnapshot<unknown>) => rowIndex(state, key), [key]);
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
  /** The value is missing or of another type than the column's, so the cell shows nothing. */
  readonly empty: boolean;
}

export interface CellProps<T> extends ElementAttributes<HTMLDivElement>, PartProps<CellState> {
  readonly column: Column<T>;
  /** Replaces the formatted value. */
  readonly children?: ReactNode;
}

function useCell<T>(column: Column<T>) {
  const { view } = useTableContext("<Table.Cell>");
  const { row } = useRowContext("<Table.Cell>");
  const kind = view.kinds.get(column.id);
  const item = row.item as T;
  const value = presentValue(column, kind, item);
  return {
    value: value === undefined ? null : column.render(value, item),
    state: {
      align: columnAlign(column as Column<unknown>, kind),
      numeric: kind === "number" || kind === "bigint",
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
 * toggle. It formats exactly as the cell would (column kind, missing values, `format`), which
 * the column API alone cannot reproduce, because kinds are inferred from the data.
 */
export function Value<T>({ column }: { readonly column: Column<T> }): ReactNode {
  return useCell(column).value;
}
