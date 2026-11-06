import { useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { createRoot } from "../tree/root.js";
import type { RootState } from "../tree/root.js";
import { useStore } from "../use-store.js";
import type { PartProps, StyleProps } from "../use-render.js";
import { TableContext } from "./context.js";
import { getTableView } from "./handle.js";
import type { TableHandleBase } from "./handle.js";

export type { RootState } from "../tree/root.js";

export interface RootProps<T> extends ElementAttributes<HTMLDivElement>, PartProps<RootState> {
  readonly children?: ReactNode | undefined;
  /** The table from `useTable`. */
  readonly table: TableHandleBase<T>;
}

const GridRoot = createRoot("grid", "<Table.Root>");
const TreegridRoot = createRoot("treegrid", "<Table.Root>");

const selectCount = (state: { readonly rows: readonly unknown[] }) => state.rows.length;

/**
 * The table's focusable root: `role="treegrid"` when rows nest, `role="grid"` otherwise. It
 * owns the TanStack table and its navigation (as `Tree.Root` does), whose commands include
 * `table.sort` and `table.next-column`, and sets `--dd-table-columns` to the columns' tracks.
 */
export function Root({ table, style, children, ...props }: RootProps<unknown>): ReactElement {
  const view = useStore(getTableView(table));
  const count = useStore(table.state, selectCount);
  const context = useMemo(() => ({ table, view }), [table, view]);
  const tracks = view.columns.map((column) => column.meta.width ?? "minmax(0, 1fr)").join(" ");
  const own = { "--dd-table-columns": tracks } as CSSProperties;
  const rootStyle: StyleProps<RootState>["style"] = (state) => ({
    ...own,
    ...(typeof style === "function" ? style(state) : style),
  });
  const Part = view.nested ? TreegridRoot : GridRoot;
  return (
    <TableContext value={context}>
      <Part
        data-slot="table-root"
        aria-rowcount={count + 1}
        aria-colcount={view.columns.length}
        {...props}
        tree={table}
        style={rootStyle}
      >
        {children}
      </Part>
    </TableContext>
  );
}
