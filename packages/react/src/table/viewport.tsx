import { useCallback } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import type { TreeRow } from "../tree/handle.js";
import { Viewport as TreeViewport } from "../tree/viewport.js";
import type { Virtualizer, ViewportState } from "../tree/viewport.js";
import type { PartProps } from "../use-render.js";
import type { VirtualOptions } from "../virtual/tanstack-virtual.js";
import { useTableContext } from "./context.js";
import type { TableHandleBase } from "./handle.js";
import { Header } from "./header.js";
import { Cell, Row, Toggle, Value } from "./row.js";

export type { ViewportState } from "../tree/viewport.js";

export interface ViewportProps<T>
  extends ElementAttributes<HTMLDivElement>, PartProps<ViewportState> {
  /** The table passed to the enclosing root; its item type types `row.original`. */
  readonly table: TableHandleBase<T>;
  /**
   * Renders one visible row, usually `(row) => <Table.Row row={row}>…</Table.Row>`. Defaults to
   * a row with one `<Table.Cell>` per column and, when rows nest, the toggle in the first cell.
   * As in `Tree.Viewport`, a row whose only change is its position does not re-render.
   */
  readonly children?: ((row: TreeRow<T>) => ReactNode) | undefined;
  /** Mounts only the rows in view, as in `Tree.Viewport`; `virtual={{ overscan, … }}` tunes it. */
  readonly virtual?: boolean | VirtualOptions | undefined;
  /** A custom rendering strategy, instead of `virtual`. */
  readonly virtualizer?: Virtualizer | undefined;
  /**
   * The header row, rendered first inside the scroll element so it sticks to the top and
   * scrolls sideways with the rows. Defaults to `<Table.Header />`; pass `null` for none.
   */
  readonly header?: ReactNode;
}

/**
 * The scrolling `rowgroup`: the tree's viewport, so it keeps the highlighted row in view and in
 * place through live updates, and takes the same `virtual` and `virtualizer` props.
 */
export function Viewport<T>({
  table,
  children,
  header = <Header />,
  ...props
}: ViewportProps<T>): ReactElement {
  const { view } = useTableContext("<Table.Viewport>");
  const { columns, nested } = view;
  const fallback = useCallback(
    (row: TreeRow<unknown>) => (
      <Row row={row}>
        {columns.map((column, index) => (
          <Cell key={column.id} column={column}>
            {nested && index === 0 ? (
              <>
                <Toggle />
                <Value column={column} />
              </>
            ) : undefined}
          </Cell>
        ))}
      </Row>
    ),
    [columns, nested],
  );
  return (
    <TreeViewport
      data-slot="table-viewport"
      role="rowgroup"
      {...props}
      tree={table}
      header={header}
      children={(children ?? fallback) as (row: TreeRow<unknown>) => ReactNode}
    />
  );
}
