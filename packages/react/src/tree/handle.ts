import { useId, useInsertionEffect, useLayoutEffect, useState } from "react";
import { treePreset } from "@densedash/core";
import type {
  ChangeDetails,
  Controllable,
  ExpandedState,
  KeyLayer,
  NavigableTable,
  NavigationCommands,
  NavigationOptions,
  NavigationSnapshot,
  NavigationTable,
  RowData,
  RowSelectionState,
  TreeAction,
  TreeChangeReason,
  TreeCommands,
  TreeFocusStrategy,
  TreeLabels,
} from "@densedash/core";
import type { ReadableStore } from "../use-store.js";

/**
 * Options for `useTree` and `useList`. Rows come from `data`; `getSubRows` nests them (a tree,
 * or a two-level list). Callbacks always run their latest version. Rows recompute when `data`
 * or a controlled value changes, so pass new `data` when `getSubRows` or `isDisabled` would
 * answer differently.
 */
export interface UseTreeOptions<T> {
  readonly data: readonly T[];
  /** A stable, unique id for the item, across every level. */
  getRowId(item: NoInfer<T>, index: number): string;
  getSubRows?(item: NoInfer<T>, index: number): readonly NoInfer<T>[] | undefined;
  isDisabled?(item: NoInfer<T>): boolean;
  /** Typeahead text. Defaults to the row id. */
  getTextValue?(item: NoInfer<T>): string;
  /** Supply a stable id for server rendering. Otherwise generated per instance. */
  readonly id?: string;
  readonly focusStrategy?: TreeFocusStrategy;
  readonly selectionMode?: "single" | "multiple";
  /** The highlighted row id. */
  readonly highlighted?: Controllable<string | null, TreeChangeReason>;
  /** TanStack's expanded state: `true` or `{ [id]: true }`. */
  readonly expanded?: Controllable<ExpandedState, TreeChangeReason>;
  /** TanStack's row selection state: `{ [id]: true }`. */
  readonly rowSelection?: Controllable<RowSelectionState, TreeChangeReason>;
  readonly loop?: boolean;
  /** Number of enabled rows per page. Defaults to 10. */
  readonly pageSize?: number;
  /** Milliseconds between typed characters. Defaults to 500. */
  readonly typeaheadMs?: number;
  readonly labels?: TreeLabels;
  /** Instance label and optional preset/overrides; keys work throughout the page. */
  readonly keys?: KeyLayer | undefined;
  onOpen?(item: NoInfer<T>, details: ChangeDetails<TreeChangeReason>): void;
}

/**
 * One visible row: TanStack's `Row`, typed by the members the parts use. `row.original` is the
 * app's item. The methods read the table's live state; the full row API is on `tree.table`.
 */
// `out` declares the variance, so the compiler need not measure it for each consumer.
export interface TreeRow<out T> {
  readonly id: string;
  readonly original: T;
  /** The index among its siblings in `data` (or its parent's sub-rows). */
  readonly index: number;
  /** Zero-based nesting depth. */
  readonly depth: number;
  readonly parentId?: string | undefined;
  getIsExpanded(): boolean;
  /** The row has sub-rows. */
  getCanExpand(): boolean;
  getIsSelected(): boolean;
  /** False for a disabled row. */
  getCanSelect(): boolean;
}

/** The core's navigation state plus the visible rows: parents with expanded sub-rows inserted. */
export interface TreeSnapshot<out T> extends NavigationSnapshot {
  readonly rows: readonly TreeRow<T>[];
}

/**
 * What the parts read from a tree: its rows, state and commands. Every `TreeHandle<T>` is one;
 * parts take this so they need not relate the handle's TanStack table type.
 */
export interface TreeHandleBase<out T> {
  /** Rows and state; empty until the root mounts. Read it with `useStore`. */
  readonly state: ReadableStore<TreeSnapshot<T>>;
  /** The mounted tree's commands; they do nothing while no root is mounted. */
  readonly commands: TreeCommands;
}

/**
 * A tree owned by a component: pass it to `<Tree.Root tree={…}>` and `<Tree.Viewport tree={…}>`.
 * The root part creates the TanStack table and navigation when it mounts and disposes them when
 * it unmounts.
 */
// TanStack's table type is invariant in its data, so this handle is too; parts take the base.
export interface TreeHandle<in out T extends RowData> extends TreeHandleBase<T> {
  /**
   * The mounted TanStack table, the escape hatch for its row, expansion and selection APIs;
   * `null` until the root mounts, and a new table if the root remounts. The tree's state
   * changes when it does, so read it in a component that reads `state` with `useStore`.
   */
  readonly table: NavigationTable<T> | null;
}

/** Internal: what `useTable` adds to a tree's options, passed through to the navigation. */
export interface TreeHandleOptions<T extends RowData> extends UseTreeOptions<T> {
  readonly columns?: NonNullable<NavigationOptions<T>["columns"]>;
  readonly sorting?: Controllable<NavigationSnapshot["sorting"], TreeChangeReason>;
}

/** Internal: the handle `useTreeHandle` returns, whose commands include the sort commands. */
export interface NavigationHandle<in out T extends RowData> extends TreeHandle<T> {
  readonly commands: NavigationCommands;
}

export interface TreeHandleInternals {
  /** Creation options with stable callbacks that call the latest render's functions. */
  options(): NavigationOptions<RowData>;
  attach(core: NavigableTable<RowData>): () => void;
  /** The thrown error of the last data update, if any; the root rethrows it during render. */
  readonly failure: ReadableStore<{ readonly cause: unknown } | null>;
  /** Why the highlight last changed; the viewport does not scroll for pointer highlights. */
  readonly highlightReason: () => TreeChangeReason | undefined;
}

const internals = new WeakMap<object, TreeHandleInternals>();

export function getInternals(handle: TreeHandleBase<unknown>): TreeHandleInternals {
  const found = internals.get(handle);
  if (found === undefined) throw new Error("densedash: pass a tree created by useTree().");
  return found;
}

const empty: TreeSnapshot<never> = {
  rows: [],
  highlighted: null,
  anchor: null,
  chosenColumn: null,
  expanded: {},
  rowSelection: {},
  sorting: [],
  columnFilters: [],
  globalFilter: undefined,
  columnOrder: [],
  columnSizing: {},
  columnVisibility: {},
};

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

type Controls = "highlighted" | "expanded" | "rowSelection" | "sorting";
const controls = [
  "highlighted",
  "expanded",
  "rowSelection",
  "sorting",
] as const satisfies readonly Controls[];
const plain = [
  "data",
  "columns",
  "focusStrategy",
  "selectionMode",
  "loop",
  "pageSize",
  "typeaheadMs",
] as const;

function createHandle<T extends RowData>(initial: TreeHandleOptions<T>, generatedId: string) {
  let latest = initial;
  let core: NavigableTable<T> | null = null;
  let reason: TreeChangeReason | undefined;
  const snapshot = signal<TreeSnapshot<T>>(empty);
  const failure = signal<{ readonly cause: unknown } | null>(null);

  function control<V>(name: Controls, input: Controllable<V, TreeChangeReason> | undefined) {
    return {
      ...(input?.value === undefined ? {} : { value: input.value }),
      ...(input?.defaultValue === undefined ? {} : { defaultValue: input.defaultValue }),
      onChange(value: V, details: ChangeDetails<TreeChangeReason>) {
        if (name === "highlighted") reason = details.reason;
        const current = latest[name] as Controllable<V, TreeChangeReason> | undefined;
        current?.onChange?.(value, details);
      },
    } satisfies Controllable<V, TreeChangeReason>;
  }

  const options = (): NavigationOptions<T> => {
    const {
      getRowId: _getRowId,
      getSubRows: _getSubRows,
      isDisabled: _isDisabled,
      getTextValue: _getTextValue,
      onOpen: _onOpen,
      ...rest
    } = latest;
    return {
      ...rest,
      id: latest.id ?? generatedId,
      getRowId: (item, index) => latest.getRowId(item, index),
      getSubRows: (item, index) => latest.getSubRows?.(item, index),
      isDisabled: (item) => latest.isDisabled?.(item) ?? false,
      getTextValue: (item) => latest.getTextValue?.(item) ?? latest.getRowId(item, 0),
      onOpen:
        latest.onOpen === undefined ? undefined : (item, details) => latest.onOpen?.(item, details),
      highlighted: control<string | null>("highlighted", latest.highlighted),
      expanded: control<ExpandedState>("expanded", latest.expanded),
      rowSelection: control<RowSelectionState>("rowSelection", latest.rowSelection),
      sorting: control<NavigationSnapshot["sorting"]>("sorting", latest.sorting),
    };
  };

  // The options the core last received; `sync` sends what changed since.
  let applied = initial;

  function sync(): void {
    const previous = applied;
    const next = latest;
    applied = latest;
    if (core === null || previous === next) return;
    const changes: Partial<NavigationOptions<T>> = {};
    for (const name of plain) {
      if (!Object.is(previous[name], next[name]) && next[name] !== undefined) {
        Object.assign(changes, { [name]: next[name] });
      }
    }
    if (JSON.stringify(previous.keys) !== JSON.stringify(next.keys)) changes.keys = next.keys;
    // Labels are usually an inline object, so compare them by value.
    const labels = next.labels;
    if (
      labels !== undefined &&
      (labels.expand !== previous.labels?.expand || labels.collapse !== previous.labels?.collapse)
    ) {
      changes.labels = labels;
    }
    const current = options();
    if ((previous.onOpen === undefined) !== (next.onOpen === undefined)) {
      changes.onOpen = current.onOpen;
    }
    for (const name of controls) {
      if (!Object.is(previous[name]?.value, next[name]?.value)) {
        Object.assign(changes, { [name]: current[name] });
      }
    }
    if (Object.keys(changes).length === 0) return;
    try {
      core.update(changes);
    } catch (cause) {
      // Malformed data (duplicate ids) keeps the last good rows; the root rethrows.
      failure.set({ cause });
    }
  }

  const delegate =
    (run: (commands: TreeCommands, action?: TreeAction) => void) => (action?: TreeAction) => {
      if (core !== null) run(core.commands, action);
    };
  const commands: NavigationCommands = {
    next: delegate((tree, action) => tree.next(action)),
    prev: delegate((tree, action) => tree.prev(action)),
    first: delegate((tree, action) => tree.first(action)),
    last: delegate((tree, action) => tree.last(action)),
    page: (direction, action) => core?.commands.page(direction, action),
    parent: delegate((tree, action) => tree.parent(action)),
    expand: delegate((tree, action) => tree.expand(action)),
    collapse: delegate((tree, action) => tree.collapse(action)),
    toggle: delegate((tree, action) => tree.toggle(action)),
    select: delegate((tree, action) => tree.select(action)),
    extendSelection: delegate((tree, action) => tree.extendSelection(action)),
    open: delegate((tree, action) => tree.open(action)),
    sort: (column, action) => core?.commands.sort(column, action),
    chooseColumn: (direction, action) => core?.commands.chooseColumn(direction, action),
  };

  const handle: NavigationHandle<T> = {
    state: { get: snapshot.get, subscribe: snapshot.subscribe },
    commands,
    get table() {
      return core?.table ?? null;
    },
  };
  const internal: TreeHandleInternals = {
    // The table treats items as opaque; only this handle's callbacks read them as `T`.
    options: options as unknown as () => NavigationOptions<RowData>,
    attach(attached) {
      const next = attached as unknown as NavigableTable<T>;
      // TanStack's rows provide every TreeRow member; the narrow type keeps consumers cheap.
      const read = (state: NavigationSnapshot): TreeSnapshot<T> => ({
        ...state,
        rows: next.table.getRowModel().rows as readonly TreeRow<T>[],
      });
      core = next;
      applied = latest;
      failure.set(null);
      snapshot.set(read(next.state.get()));
      const unsubscribe = next.state.subscribe((state) => snapshot.set(read(state)));
      return () => {
        unsubscribe();
        if (core !== next) return;
        core = null;
        failure.set(null);
        snapshot.set(empty);
      };
    },
    failure: { get: failure.get, subscribe: failure.subscribe },
    highlightReason: () => reason,
  };
  internals.set(handle, internal);
  const record = (next: TreeHandleOptions<T>) => {
    latest = next;
  };
  return { handle, record, sync };
}

/**
 * Creates a tree for `<Tree.Root>` and `<Tree.Viewport>`. The item type is inferred from
 * `data`, so `row.original` in the viewport's row function is the app's type. Pass the options
 * on every render; callbacks need not be stable.
 */
export function useTree<T extends RowData>(options: UseTreeOptions<T>): TreeHandle<T> {
  return useTreeHandle({
    ...options,
    keys:
      options.keys === undefined
        ? undefined
        : { ...options.keys, preset: options.keys.preset ?? treePreset },
  });
}

/** Internal: `useTree` with the Table's columns and sorting; `commands` includes `table.*`. */
export function useTreeHandle<T extends RowData>(
  options: TreeHandleOptions<T>,
): NavigationHandle<T> {
  const id = useId();
  const [{ handle, record, sync }] = useState(() => createHandle(options, `dd-tree${id}`));
  // Record before any layout effect, so a root mounting in this commit creates the core from
  // these options; then send the changes to an already mounted core.
  useInsertionEffect(() => {
    record(options);
  });
  useLayoutEffect(() => {
    sync();
  });
  return handle;
}
