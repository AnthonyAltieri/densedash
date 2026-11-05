import { useCallback } from "react";
import type { ReactElement, ReactNode } from "react";
import type { TreeRow } from "@densedash/core";
import type { ElementAttributes } from "../element-attributes.js";
import { Viewport as TreeViewport } from "../tree/viewport.js";
import type { Virtualizer, ViewportState } from "../tree/viewport.js";
import type { PartProps } from "../use-render.js";
import { useTableContext } from "./context.js";
import { getTableInternals } from "./handle.js";
import type { TableHandle } from "./handle.js";
import { Cell, Row, Toggle, Value } from "./row.js";

export type { ViewportState } from "../tree/viewport.js";

export interface ViewportProps<T>
  extends ElementAttributes<HTMLDivElement>, PartProps<ViewportState> {
  /** The table passed to the enclosing root; its item type types `row.item`. */
  readonly table: TableHandle<T>;
  /**
   * Renders one visible row, usually `(row) => <Table.Row row={row}>…</Table.Row>`. Defaults to
   * a row with one `<Table.Cell>` per column and, when rows nest, the toggle in the first cell.
   */
  readonly children?: ((row: TreeRow<T>) => ReactNode) | undefined;
  readonly virtualizer?: Virtualizer | undefined;
}

/**
 * The scrolling `rowgroup`: the tree's viewport, so it keeps the highlighted row in view and in
 * place through live updates, and takes the same `virtualizer`.
 */
export function Viewport<T>({ table, children, ...props }: ViewportProps<T>): ReactElement {
  const { view } = useTableContext("<Table.Viewport>");
  const { tree } = getTableInternals(table as TableHandle<unknown>);
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
      tree={tree}
      children={(children ?? fallback) as (row: TreeRow<unknown>) => ReactNode}
    />
  );
}
