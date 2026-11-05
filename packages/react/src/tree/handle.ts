import { useId, useInsertionEffect, useLayoutEffect, useState } from "react";
import type {
  ChangeDetails,
  Controllable,
  Key,
  Tree as CoreTree,
  TreeAction,
  TreeBaseOptions,
  TreeChangeReason,
  TreeCommands,
  TreeOptions,
  TreeSnapshot,
} from "@densedash/core";
import type { ReadableStore } from "../use-store.js";

/**
 * Options for `useTree`: the core tree's options without `mode` and `scope`, which the root part
 * supplies. Callbacks always run their latest version. Rows recompute when `roots` or a
 * controlled value changes, so pass new `roots` when `getChildren` or `isDisabled` would answer
 * differently.
 */
export interface UseTreeOptions<T> extends TreeBaseOptions<T> {}

/**
 * A tree owned by a component: pass it to `<Tree.Root tree={…}>` and `<Tree.Viewport tree={…}>`.
 * The root part creates the core tree when it mounts and disposes it when it unmounts.
 */
export interface TreeHandle<out T> {
  /** Rows and state; empty until the root mounts. Read it with `useStore`. */
  readonly state: ReadableStore<TreeSnapshot<T>>;
  /** The mounted tree's commands; they do nothing while no root is mounted. */
  readonly commands: TreeCommands;
}

export interface TreeHandleInternals<T> {
  /** Creation options with stable callbacks that call the latest render's functions. */
  options(): TreeOptions<T>;
  attach(core: CoreTree<T>): () => void;
  /** The thrown error of the last data update, if any; the root rethrows it during render. */
  readonly failure: ReadableStore<{ readonly cause: unknown } | null>;
  /** Why the highlight last changed; the viewport does not scroll for pointer highlights. */
  readonly highlightReason: () => TreeChangeReason | undefined;
}

const internals = new WeakMap<object, TreeHandleInternals<never>>();

export function getInternals<T>(handle: TreeHandle<T>): TreeHandleInternals<T> {
  const found = internals.get(handle) as TreeHandleInternals<T> | undefined;
  if (found === undefined) throw new Error("densedash: pass a tree created by useTree().");
  return found;
}

const empty: TreeSnapshot<never> = {
  rows: [],
  highlighted: null,
  selected: new Set(),
  expanded: new Set(),
  anchor: null,
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

type Controls = "highlighted" | "selected" | "expanded";
const controls = ["highlighted", "selected", "expanded"] as const satisfies readonly Controls[];
const plain = [
  "roots",
  "focusStrategy",
  "selectionMode",
  "loop",
  "pageSize",
  "typeaheadMs",
] as const;

function createHandle<T>(initial: UseTreeOptions<T>, generatedId: string) {
  let latest = initial;
  let core: CoreTree<T> | null = null;
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

  const options = (): TreeOptions<T> => ({
    ...latest,
    id: latest.id ?? generatedId,
    getKey: (item) => latest.getKey(item),
    getChildren: (item) => latest.getChildren?.(item),
    isDisabled: (item) => latest.isDisabled?.(item) ?? false,
    getTextValue: (item) => latest.getTextValue?.(item) ?? latest.getKey(item),
    onOpen: (item, details) => latest.onOpen?.(item, details),
    highlighted: control<Key | null>("highlighted", latest.highlighted),
    selected: control<ReadonlySet<Key>>("selected", latest.selected),
    expanded: control<ReadonlySet<Key>>("expanded", latest.expanded),
  });

  // The options the core last received; `sync` sends what changed since.
  let applied = initial;

  function sync(): void {
    const previous = applied;
    const next = latest;
    applied = latest;
    if (core === null || previous === next) return;
    const changes: Partial<TreeOptions<T>> = {};
    for (const name of plain) {
      if (!Object.is(previous[name], next[name]) && next[name] !== undefined) {
        Object.assign(changes, { [name]: next[name] });
      }
    }
    // Labels are usually an inline object, so compare them by value.
    const labels = next.labels;
    if (
      labels !== undefined &&
      (labels.expand !== previous.labels?.expand || labels.collapse !== previous.labels?.collapse)
    ) {
      changes.labels = labels;
    }
    const current = options();
    for (const name of controls) {
      if (!Object.is(previous[name]?.value, next[name]?.value)) {
        Object.assign(changes, { [name]: current[name] });
      }
    }
    if (Object.keys(changes).length === 0) return;
    try {
      core.update(changes);
    } catch (cause) {
      // Malformed data (duplicate keys, cycles) keeps the last good rows; the root rethrows.
      failure.set({ cause });
    }
  }

  const delegate =
    (run: (commands: TreeCommands, action?: TreeAction) => void) => (action?: TreeAction) => {
      if (core !== null) run(core.commands, action);
    };
  const commands: TreeCommands = {
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
  };

  const handle: TreeHandle<T> = {
    state: { get: snapshot.get, subscribe: snapshot.subscribe },
    commands,
  };
  const internal: TreeHandleInternals<T> = {
    options,
    attach(next) {
      core = next;
      applied = latest;
      failure.set(null);
      snapshot.set(next.state.get());
      const unsubscribe = next.state.subscribe((state) => snapshot.set(state));
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
  internals.set(handle, internal as TreeHandleInternals<never>);
  const record = (next: UseTreeOptions<T>) => {
    latest = next;
  };
  return { handle, record, sync };
}

/**
 * Creates a tree for `<Tree.Root>` and `<Tree.Viewport>`. The item type is inferred from
 * `roots`, so `row.item` in the viewport's row function is the app's type. Pass the options on
 * every render; callbacks need not be stable.
 */
export function useTree<T>(options: UseTreeOptions<T>): TreeHandle<T> {
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
