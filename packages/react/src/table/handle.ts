import { useInsertionEffect, useMemo, useState } from "react";
import type {
  ChangeDetails,
  Controllable,
  RowData,
  TreeChangeReason,
  TreeCommands,
  TreeFocusStrategy,
  TreeLabels,
} from "@densedash/core";
import { useTree } from "../tree/handle.js";
import type { TreeHandleBase, UseTreeOptions } from "../tree/handle.js";
import { useStore } from "../use-store.js";
import type { ReadableStore } from "../use-store.js";
import { getSortedRows, inferKinds } from "./columns.js";
import type { Column, ColumnKinds, TableSort } from "./columns.js";

/** A sort that is controlled (`value`), uncontrolled (`defaultValue`) or both observed. */
export interface TableSortControl {
  /** Controlled sort; `null` means unsorted. */
  readonly value?: TableSort | null | undefined;
  readonly defaultValue?: TableSort | null | undefined;
  onChange?(sort: TableSort | null): void;
}

/**
 * Options for `useTable`: a tree's options plus columns and sorting. Rows nest (a `treegrid`)
 * when `getChildren` is given and are flat (a `grid`) otherwise. Define `columns` once (at
 * module level or memoized): column kinds are inferred again whenever `roots` or `columns`
 * change.
 */
// DD-30 moves Table onto TanStack's data, row ids and state; until then it keeps these options.
export interface UseTableOptions<T> {
  roots: readonly T[];
  getKey(item: NoInfer<T>): string;
  getChildren?(item: NoInfer<T>): readonly NoInfer<T>[] | undefined;
  isDisabled?(item: NoInfer<T>): boolean;
  getTextValue?(item: NoInfer<T>): string;
  /** Supply a stable id for server rendering. Otherwise generated per instance. */
  id?: string;
  focusStrategy?: TreeFocusStrategy;
  selectionMode?: "single" | "multiple";
  highlighted?: Controllable<string | null, TreeChangeReason>;
  selected?: Controllable<ReadonlySet<string>, TreeChangeReason>;
  expanded?: Controllable<ReadonlySet<string>, TreeChangeReason>;
  loop?: boolean;
  /** Number of enabled rows per page. Defaults to 10. */
  pageSize?: number;
  /** Milliseconds between typed characters. Defaults to 500. */
  typeaheadMs?: number;
  labels?: TreeLabels;
  onOpen?(item: NoInfer<T>, details: ChangeDetails<TreeChangeReason>): void;
  readonly columns: readonly Column<NoInfer<T>>[];
  readonly sort?: TableSortControl | undefined;
}

export interface TableState {
  readonly sort: TableSort | null;
  /** The column the sort command acts on; null until one is chosen. */
  readonly chosen: string | null;
}

export interface TableCommands extends TreeCommands {
  /** Cycles a column (default: the chosen column) through ascending, descending and unsorted. */
  sort(column?: string): void;
  /** Chooses the next (1) or previous (-1) sortable column; an active sort moves with it. */
  chooseColumn(direction?: 1 | -1): void;
}

/** A table owned by a component: pass it to `<Table.Root>` and `<Table.Viewport>`. */
export interface TableHandle<out T> extends TreeHandleBase<T> {
  readonly commands: TableCommands;
  /** The current sort and chosen column. Read it with `useStore`. */
  readonly sorting: ReadableStore<TableState>;
}

/** What the parts render from: replaced only when the columns, kinds or nesting change. */
export interface TableView {
  readonly columns: readonly Column<unknown>[];
  readonly kinds: ColumnKinds;
  readonly nested: boolean;
}

export interface TableInternals {
  readonly tree: TreeHandleBase<unknown>;
  readonly view: ReadableStore<TableView>;
}

const internals = new WeakMap<object, TableInternals>();

export function getTableInternals(table: TableHandle<unknown>): TableInternals {
  const found = internals.get(table);
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

function sameKinds(left: ColumnKinds, right: ColumnKinds): boolean {
  if (left.size !== right.size) return false;
  for (const [id, kind] of left) if (right.get(id) !== kind) return false;
  return true;
}

interface Latest<T> {
  readonly options: UseTableOptions<T>;
  readonly sort: TableSort | null;
  readonly view: TableView;
}

// The tree's id-keyed records, kept per set so a controlled set maps to a stable record.
const records = new WeakMap<ReadonlySet<string>, Record<string, true>>();

function record(keys: ReadonlySet<string>): Record<string, true> {
  let found = records.get(keys);
  if (found === undefined) {
    found = Object.fromEntries(Array.from(keys, (key) => [key, true as const]));
    records.set(keys, found);
  }
  return found;
}

/** Maps a set-based control onto the tree's `{ [id]: true }` state. */
function keyControl(
  control: Controllable<ReadonlySet<string>, TreeChangeReason> | undefined,
): Controllable<Record<string, true>, TreeChangeReason> | undefined {
  if (control === undefined) return undefined;
  return {
    ...(control.value === undefined ? {} : { value: record(control.value) }),
    ...(control.defaultValue === undefined ? {} : { defaultValue: record(control.defaultValue) }),
    onChange: (value, details) =>
      control.onChange?.(new Set(Object.keys(value).filter((key) => value[key])), details),
  };
}

function createTableHandle<T>(
  tree: TreeHandleBase<T>,
  state: ReturnType<typeof signal<TableState>>,
  initial: Latest<T>,
) {
  let latest = initial;
  const view = signal<TableView>(initial.view);

  const sortable = () => latest.view.columns.filter((column) => column.sortable);
  // The store holds the uncontrolled sort and mirrors a controlled one, so commands that run
  // twice before React commits still see the first command's sort.
  const active = () => state.get().sort;
  const current = () => state.get().chosen ?? active()?.column ?? sortable()[0]?.id ?? null;

  function request(sort: TableSort | null, chosen: string | null): void {
    const previous = active();
    const controlled = latest.options.sort?.value !== undefined;
    state.set({ sort: controlled ? previous : sort, chosen });
    if (!Object.is(sort, previous)) latest.options.sort?.onChange?.(sort);
  }

  const commands: TableCommands = {
    ...tree.commands,
    sort(column) {
      const id = column ?? current();
      if (id === null || !sortable().some((each) => each.id === id)) return;
      const sort = active();
      const next: TableSort | null =
        sort?.column !== id
          ? { column: id, direction: "ascending" }
          : sort.direction === "ascending"
            ? { column: id, direction: "descending" }
            : null;
      request(next, id);
    },
    chooseColumn(direction = 1) {
      const columns = sortable();
      if (columns.length === 0) return;
      const index = columns.findIndex((column) => column.id === current());
      const next = columns[(index + direction + columns.length) % columns.length]!.id;
      const sort = active();
      request(sort === null ? null : { column: next, direction: sort.direction }, next);
    },
  };

  const handle: TableHandle<T> = {
    state: tree.state,
    commands,
    sorting: { get: state.get, subscribe: state.subscribe },
  };
  internals.set(handle, { tree, view });

  function record(next: Latest<T>): void {
    const previous = latest;
    latest = next;
    if (next.options.sort?.value !== undefined && !Object.is(next.sort, state.get().sort)) {
      state.set({ ...state.get(), sort: next.sort });
    }
    if (
      previous.view.columns !== next.view.columns ||
      previous.view.kinds !== next.view.kinds ||
      previous.view.nested !== next.view.nested
    ) {
      view.set(next.view);
    }
  }
  return { handle, record };
}

/**
 * Creates a table for `<Table.Root>` and `<Table.Viewport>`. The item type is inferred from
 * `roots`; `columns` must be defined for that type (see `columns<T>()`). Rows are sorted before
 * they reach the tree core, children within their parent, so keyboard navigation, live-feed
 * anchoring and virtualization are the tree's.
 */
export function useTable<T>(options: UseTableOptions<T>): TableHandle<T> {
  const {
    columns,
    sort: control,
    roots,
    getKey,
    getChildren,
    selected,
    expanded,
    ...rest
  } = options;
  const [state] = useState(() =>
    signal<TableState>({
      sort: control?.value !== undefined ? control.value : (control?.defaultValue ?? null),
      chosen: null,
    }),
  );
  const own = useStore(state);
  const sort = control?.value !== undefined ? control.value : own.sort;
  const [kindCache] = useState(() => ({ current: new Map() as ColumnKinds }));
  const kinds = useMemo(() => {
    const next = inferKinds(roots, getChildren, columns);
    // Keep the identity while kinds are unchanged, so live data does not re-render every cell.
    if (!sameKinds(kindCache.current, next)) kindCache.current = next;
    return kindCache.current;
  }, [kindCache, roots, getChildren, columns]);
  const sorted = useMemo(
    () => getSortedRows({ roots, getChildren, columns, sort, kinds }),
    [roots, getChildren, columns, sort, kinds],
  );
  const expandedControl = keyControl(expanded);
  const rowSelection = keyControl(selected);
  const sortedChildren = sorted.getChildren;
  const treeOptions: UseTreeOptions<T> = {
    ...rest,
    data: sorted.roots,
    getRowId: (item) => getKey(item),
    ...(sortedChildren === undefined ? {} : { getSubRows: (item) => sortedChildren(item) }),
    ...(expandedControl === undefined ? {} : { expanded: expandedControl }),
    ...(rowSelection === undefined ? {} : { rowSelection }),
  };
  // TanStack constrains items to objects; the table's columns read them as `T`.
  const tree = useTree(
    treeOptions as unknown as UseTreeOptions<RowData>,
  ) as unknown as TreeHandleBase<T>;
  const nested = getChildren !== undefined;
  const view = useMemo(
    (): TableView => ({ columns: columns as readonly Column<unknown>[], kinds, nested }),
    [columns, kinds, nested],
  );
  const latest: Latest<T> = { options, sort, view };
  const [{ handle, record }] = useState(() => createTableHandle(tree, state, latest));
  useInsertionEffect(() => {
    record(latest);
  });
  return handle;
}
