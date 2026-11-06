import type { MouseEvent as ReactMouseEvent, ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import type { TreeSnapshot } from "../tree/handle.js";
import type { ColumnAlign, SortDirection, TableColumnDef } from "./columns.js";
import { useTableContext } from "./context.js";

export interface HeaderState {}

export interface HeaderProps extends ElementAttributes<HTMLDivElement>, PartProps<HeaderState> {
  /** Defaults to one `<Table.HeaderCell>` per column. */
  readonly children?: ReactNode;
}

/**
 * The header `row`, first in row order (`aria-rowindex` 1). `<Table.Viewport>` renders it as its
 * first child by default (see its `header` prop), where the stylesheet makes it sticky.
 */
export function Header({
  children,
  render,
  ref,
  className,
  style,
  ...props
}: HeaderProps): ReactElement {
  const { view } = useTableContext("<Table.Header>");
  const cells =
    children ?? view.columns.map((column) => <HeaderCell key={column.id} column={column} />);
  return useRender({
    render,
    ref,
    props: {
      ...mergeProps(
        { "data-slot": "table-header", role: "row", "aria-rowindex": 1, children: cells },
        props,
      ),
      className,
      style,
    },
  });
}

export interface HeaderCellState {
  readonly align: ColumnAlign;
  readonly numeric: boolean;
  readonly sortable: boolean;
  /** The table is sorted by this column. */
  readonly sorted: boolean;
  /** The sort command acts on this column. */
  readonly chosen: boolean;
  /** The sort direction; undefined when the table is not sorted by this column. */
  readonly direction: SortDirection | undefined;
}

export interface HeaderCellProps<T>
  extends ElementAttributes<HTMLDivElement>, PartProps<HeaderCellState> {
  readonly column: TableColumnDef<T>;
  /** Defaults to the column's `header`. */
  readonly children?: ReactNode;
}

const ASCENDING = 1;
const DESCENDING = 2;
const CHOSEN = 4;

/** A `columnheader`; clicking a sortable one cycles its sort, as `table.sort` does. */
export function HeaderCell<T>({
  column,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: HeaderCellProps<T>): ReactElement {
  const { table } = useTableContext("<Table.HeaderCell>");
  const id = column.id;
  // One packed number, so each header cell re-renders only when its own sort state changes.
  const select = (state: TreeSnapshot<unknown>) => {
    const sorted = state.sorting.find((each) => each.id === id);
    return (
      (sorted === undefined ? 0 : sorted.desc ? DESCENDING : ASCENDING) |
      (state.chosenColumn === id ? CHOSEN : 0)
    );
  };
  const token = useStore(table.state, select);
  const direction: SortDirection | undefined =
    (token & ASCENDING) !== 0 ? "ascending" : (token & DESCENDING) !== 0 ? "descending" : undefined;
  const sortable = column.enableSorting;
  const state: HeaderCellState = {
    align: column.meta.align,
    numeric: column.meta.numeric,
    sortable,
    sorted: direction !== undefined,
    chosen: (token & CHOSEN) !== 0,
    direction,
  };
  return useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        {
          "data-slot": "table-header-cell",
          role: "columnheader",
          "aria-sort": direction,
          children: children ?? column.header,
          onClick: sortable
            ? (event: ReactMouseEvent) =>
                table.commands.sort(id, { reason: "pointer", event: event.nativeEvent })
            : undefined,
        },
        props,
      ),
      className,
      style,
    },
  });
}
