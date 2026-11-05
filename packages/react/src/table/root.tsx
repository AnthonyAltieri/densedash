import { useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode, Ref } from "react";
import type { Command } from "@densedash/core";
import { useKernelFor } from "../context.js";
import type { ElementAttributes } from "../element-attributes.js";
import { useTreeContext } from "../tree/context.js";
import { createRoot } from "../tree/root.js";
import type { RootState } from "../tree/root.js";
import { useStore } from "../use-store.js";
import type { PartProps, StyleProps } from "../use-render.js";
import { TableContext } from "./context.js";
import { getTableInternals } from "./handle.js";
import type { TableHandle } from "./handle.js";

export type { RootState } from "../tree/root.js";

export interface RootProps<T> extends ElementAttributes<HTMLDivElement>, PartProps<RootState> {
  readonly children?: ReactNode | undefined;
  /** The table from `useTable`. */
  readonly table: TableHandle<T>;
}

const GridRoot = createRoot("grid", "<Table.Root>");
const TreegridRoot = createRoot("treegrid", "<Table.Root>");

const selectCount = (state: { readonly rows: readonly unknown[] }) => state.rows.length;

/** Registers `table.*` in a scope nested in the tree's, targeting the same root element. */
function SortCommands({
  table,
  element,
}: {
  table: TableHandle<unknown>;
  element: HTMLElement | null;
}): null {
  const kernel = useKernelFor("<Table.Root>");
  const { core } = useTreeContext("<Table.Root>");
  const parent = core?.scope;
  useLayoutEffect(() => {
    if (parent === undefined || element === null) return;
    const commands: Command[] = [
      { id: "table.sort", label: "Sort column", run: () => table.commands.sort() },
      {
        id: "table.next-column",
        label: "Next sort column",
        run: () => table.commands.chooseColumn(1),
      },
    ];
    return kernel.commands.register(`${parent}/table`, commands, { parent, target: element });
  }, [kernel, table, parent, element]);
  return null;
}

function assign(ref: Ref<HTMLDivElement> | undefined, element: HTMLDivElement | null) {
  if (typeof ref === "function") {
    const cleanup = ref(element);
    return typeof cleanup === "function" ? cleanup : () => ref(null);
  }
  if (ref !== null && ref !== undefined) {
    ref.current = element;
    return () => {
      ref.current = null;
    };
  }
  return undefined;
}

/**
 * The table's focusable root: `role="treegrid"` when rows nest, `role="grid"` otherwise. It
 * owns the tree core (as `Tree.Root` does) and the `table.sort` and `table.next-column`
 * commands, and sets `--dd-table-columns` to the columns' grid tracks.
 */
export function Root({ table, ref, style, children, ...props }: RootProps<unknown>): ReactElement {
  const internals = getTableInternals(table);
  const view = useStore(internals.view);
  const count = useStore(table.state, selectCount);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const merged = useMemo(
    () => (node: HTMLDivElement | null) => {
      setElement(node);
      const cleanup = assign(ref, node);
      return () => {
        cleanup?.();
        setElement(null);
      };
    },
    [ref],
  );
  const context = useMemo(() => ({ table, view }), [table, view]);
  const tracks = view.columns.map((column) => column.width ?? "minmax(0, 1fr)").join(" ");
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
        tree={internals.tree}
        ref={merged}
        style={rootStyle}
      >
        {children}
        <SortCommands table={table} element={element} />
      </Part>
    </TableContext>
  );
}
