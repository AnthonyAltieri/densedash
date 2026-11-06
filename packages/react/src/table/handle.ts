import { useLayoutEffect, useMemo, useState } from "react";
import type {
  Controllable,
  NavigationCommands,
  NavigationSnapshot,
  RowData,
  TreeChangeReason,
} from "@densedash/core";
import { useTreeHandle } from "../tree/handle.js";
import type {
  TreeHandle,
  TreeHandleBase,
  TreeHandleOptions,
  UseTreeOptions,
} from "../tree/handle.js";
import type { ReadableStore } from "../use-store.js";
import type { TableColumnDef } from "./columns.js";

/**
 * Options for `useTable`: the tree's options plus TanStack columns and sorting. Rows nest (a
 * `treegrid`) when `getSubRows` is given and are flat (a `grid`) otherwise. Define `columns`
 * once, at module level or memoized: a new array updates the TanStack table's columns.
 */
export interface UseTableOptions<T> extends UseTreeOptions<T> {
  /** Column definitions from `columns<T>()`, in display order. */
  readonly columns: readonly TableColumnDef<NoInfer<T>>[];
  /** TanStack's sorting state, `[{ id, desc }]`; the sort commands keep one entry at most. */
  readonly sorting?: Controllable<NavigationSnapshot["sorting"], TreeChangeReason>;
}

/** The tree's commands plus `sort` (`table.sort`) and `chooseColumn` (`table.next-column`). */
export type TableCommands = NavigationCommands;

/** What the parts read from a table. Every `TableHandle<T>` is one. */
export interface TableHandleBase<out T> extends TreeHandleBase<T> {
  /** The mounted table's commands; they do nothing while no root is mounted. */
  readonly commands: TableCommands;
}

/**
 * A table owned by a component: pass it to `<Table.Root>` and `<Table.Viewport>`. `state` holds
 * the TanStack `sorting` and the chosen sort column (`chosenColumn`) with the rows, and `table`
 * is the mounted TanStack table (`null` until the root mounts), as on a tree.
 */
export interface TableHandle<in out T extends RowData> extends TreeHandle<T> {
  readonly commands: TableCommands;
}

/** What the parts render from: replaced only when the columns or the nesting change. */
export interface TableView {
  readonly columns: readonly TableColumnDef<unknown>[];
  readonly nested: boolean;
}

const views = new WeakMap<object, ReadableStore<TableView> & { set(view: TableView): void }>();

export function getTableView(table: TableHandleBase<unknown>): ReadableStore<TableView> {
  const found = views.get(table);
  if (found === undefined) throw new Error("densedash: pass a table created by useTable().");
  return found;
}

function signal<S>(initial: S) {
  let value = initial;
  const listeners = new Set<(state: S) => void>();
  return {
    get: () => value,
    set(next: S) {
      if (Object.is(value, next)) return;
      value = next;
      for (const listener of listeners) listener(value);
    },
    subscribe(listener: (state: S) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Creates a table for `<Table.Root>` and `<Table.Viewport>`: a tree whose TanStack table has
 * these columns and sorting. TanStack sorts the rows, sub-rows within their parent, so keyboard
 * navigation, live-feed anchoring and virtualization are the tree's. The item type is inferred
 * from `data`; `columns` must be defined for it with `columns<T>()`.
 */
export function useTable<T extends RowData>(options: UseTableOptions<T>): TableHandle<T> {
  // The columns read items as `T`; TanStack's column type is the table's.
  const handle = useTreeHandle(options as unknown as TreeHandleOptions<T>);
  const { columns } = options;
  const nested = options.getSubRows !== undefined;
  const view = useMemo(
    (): TableView => ({ columns: columns as readonly TableColumnDef<unknown>[], nested }),
    [columns, nested],
  );
  const [store] = useState(() => {
    const found = views.get(handle);
    if (found !== undefined) return found;
    const created = signal(view);
    views.set(handle, created);
    return created;
  });
  // Publishing notifies the root, which re-renders, so this runs as a layout effect: an
  // insertion effect must not schedule updates. The root re-renders before the browser paints.
  useLayoutEffect(() => {
    store.set(view);
  });
  return handle;
}
