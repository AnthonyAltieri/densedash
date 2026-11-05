import type { RowData } from "@tanstack/table-core";
import { functionalUpdate, stateSlicesEqual } from "@tanstack/table-core";
import type { Updater } from "@tanstack/table-core";
import type { TreeState } from "../collections/types.js";
import type { ChangeDetails } from "../controllable.js";
import type { Kernel } from "../kernel.js";
import type { TreeAction, TreeChangeReason, TreeSnapshot } from "../tree/types.js";
import { reconcile } from "./reconcile.js";
import type { NavigationOptions, NavigationSnapshot, NavigationTable } from "./types.js";

export function changeDetails({
  reason = "programmatic",
  event,
}: TreeAction = {}): ChangeDetails<TreeChangeReason> {
  let canceled = false;
  return {
    reason,
    event,
    cancel() {
      canceled = true;
    },
    get canceled() {
      return canceled;
    },
  };
}

export const keyState = (keys: ReadonlySet<string>) =>
  Object.fromEntries(Array.from(keys, (key) => [key, true as const]));
const selectedKeys = (state: Record<string, boolean>) =>
  new Set(Object.keys(state).filter((key) => state[key]));
const controls = ["expanded", "sorting", "highlighted", "rowSelection"] as const;

/** Table atoms are the authority. The kernel store publishes one adapter snapshot per transaction. */
export function createNavigationModel<T extends RowData>(
  kernel: Kernel,
  table: NavigationTable<T>,
  initial: NavigationOptions<T>,
) {
  let options = initial;
  let disposed = false;
  let publishing = false;
  let staged: Partial<NavigationSnapshot> | undefined;
  let action: TreeAction = {};
  const queued: (() => void)[] = [];
  const subscriptions = new Set<() => void>();

  function read(): NavigationSnapshot {
    return table.store.state;
  }

  let validatedRows: ReturnType<typeof table.getCoreRowModel>["flatRows"] | undefined;

  function rows() {
    const core = table.getCoreRowModel();
    if (validatedRows !== core.flatRows) {
      const ids = new Set<string>();
      for (const row of core.flatRows) {
        if (ids.has(row.id)) throw new Error(`Duplicate row id "${row.id}".`);
        ids.add(row.id);
      }
      validatedRows = core.flatRows;
    }
    return table.getRowModel().rows;
  }

  let projected:
    | {
        source: ReturnType<typeof rows>;
        expanded: NavigationSnapshot["expanded"];
        disabled: NavigationOptions<T>["isDisabled"];
        text: NavigationOptions<T>["getTextValue"];
        rows: TreeSnapshot<T>["rows"];
      }
    | undefined;

  function project(): TreeSnapshot<T> {
    const state = read();
    const visible = rows();
    if (
      projected?.source !== visible ||
      projected.expanded !== state.expanded ||
      projected.disabled !== options.isDisabled ||
      projected.text !== options.getTextValue
    ) {
      const siblings = new Map<string | undefined, typeof visible>();
      for (const row of visible) {
        const group = siblings.get(row.parentId) ?? [];
        if (!siblings.has(row.parentId)) siblings.set(row.parentId, group);
        group.push(row);
      }
      const positions = new Map<string, number>();
      for (const group of siblings.values())
        group.forEach((row, index) => positions.set(row.id, index + 1));
      projected = {
        source: visible,
        expanded: state.expanded,
        disabled: options.isDisabled,
        text: options.getTextValue,
        rows: visible.map((row, index) => ({
          key: row.id,
          item: row.original,
          index,
          depth: row.depth,
          parentKey: row.parentId ?? null,
          hasChildren: row.getCanExpand(),
          expanded: row.getCanExpand() && row.getIsExpanded(),
          posInSet: positions.get(row.id)!,
          setSize: siblings.get(row.parentId)!.length,
          disabled: options.isDisabled?.(row.original) ?? false,
          textValue: options.getTextValue?.(row.original) ?? row.id,
        })),
      };
    }
    return {
      highlighted: state.highlighted,
      anchor: state.anchor,
      selected: selectedKeys(state.rowSelection),
      expanded:
        state.expanded === true
          ? new Set(
              table
                .getCoreRowModel()
                .flatRows.filter((row) => row.getCanExpand())
                .map((row) => row.id),
            )
          : selectedKeys(state.expanded),
      rows: projected.rows,
    };
  }

  const store = kernel.ports.store.create({ snapshot: read(), tree: project() });

  function write(patch: Partial<NavigationSnapshot>): void {
    // Every key is a registered state slice; the dynamic loop preserves its matching atom/value pair.
    const atoms = table.baseAtoms as unknown as Record<
      string,
      { get(): unknown; set(value: unknown): void }
    >;
    for (const [key, value] of Object.entries(patch)) {
      if (!stateSlicesEqual(atoms[key]!.get(), value)) atoms[key]!.set(value);
    }
  }

  function configure(next: NavigationOptions<T>): void {
    table.setOptions((previous) => ({
      ...previous,
      data: next.data,
      columns: next.columns ?? previous.columns,
      getRowId:
        next.getRowId ??
        ((_item, index, parent) => (parent ? `${parent.id}.${index}` : `${index}`)),
      getSubRows: (item, index) => next.getSubRows?.(item, index),
      enableRowSelection: (row) => !(next.isDisabled?.(row.original) ?? false),
      enableMultiRowSelection: next.selectionMode === "multiple",
    }));
  }

  function publish(
    patch: Partial<NavigationSnapshot>,
    why: TreeAction,
    update?: Partial<NavigationOptions<T>>,
  ): void {
    if (disposed) return;
    if (publishing) {
      queued.push(() => publish(patch, why, update));
      return;
    }
    publishing = true;
    const previous = read();
    const previousOptions = options;
    const previousTree = store.get().tree;
    try {
      table._reactivity.batch(() => {
        try {
          if (update !== undefined) {
            const nextOptions = { ...options, ...update };
            configure(nextOptions);
            options = nextOptions;
            rows(); // Validate new IDs before any callback or publication.
          }
          const baseline = { ...previous };
          if (update !== undefined) {
            for (const key of controls) {
              const value = options[key]?.value;
              if (value !== undefined) Object.assign(baseline, { [key]: value });
            }
          }
          const requested = { ...baseline, ...patch };
          const effective = { ...requested };
          for (const key of controls) {
            if (options[key]?.value !== undefined)
              Object.assign(effective, { [key]: baseline[key] });
          }
          write(effective);
          const visible = project();
          const reconciled = reconcile(previousTree.rows, visible.rows, {
            highlighted: requested.highlighted,
            anchor: requested.anchor,
            expanded: visible.expanded,
            selected: selectedKeys(requested.rowSelection),
          });
          requested.highlighted = reconciled.highlighted;
          requested.anchor = reconciled.anchor;
          requested.rowSelection = keyState(reconciled.selected);
          const details = changeDetails(why);
          for (const key of controls) {
            if (details.canceled || disposed) break;
            if (stateSlicesEqual(baseline[key], requested[key])) continue;
            // The branch keeps each Controllable callback paired with its state type.
            switch (key) {
              case "expanded":
                options.expanded?.onChange?.(requested.expanded, details);
                break;
              case "sorting":
                options.sorting?.onChange?.(requested.sorting, details);
                break;
              case "highlighted":
                options.highlighted?.onChange?.(requested.highlighted, details);
                break;
              case "rowSelection":
                options.rowSelection?.onChange?.(requested.rowSelection, details);
                break;
            }
          }
          const accepted = details.canceled || disposed ? baseline : requested;
          const final = { ...accepted };
          for (const key of controls) {
            if (options[key]?.value !== undefined) Object.assign(final, { [key]: baseline[key] });
          }
          write(final);
          if (!disposed) store.set({ snapshot: read(), tree: project() });
        } catch (cause) {
          options = previousOptions;
          if (update !== undefined) configure(previousOptions);
          write(previous);
          throw cause;
        }
      });
    } finally {
      publishing = false;
      while (!publishing && queued.length > 0 && !disposed) queued.shift()!();
    }
  }

  const subscription = table.store.subscribe(() => {
    if (!publishing && !disposed) publish({}, { reason: "programmatic" });
  });

  function request<K extends keyof NavigationSnapshot>(
    key: K,
    updater: Updater<NavigationSnapshot[K]>,
  ): void {
    if (disposed) return;
    if (publishing) {
      queued.push(() => request(key, updater));
      return;
    }
    const current = staged?.[key] ?? read()[key];
    const patch = { [key]: functionalUpdate(updater, current) };
    if (staged) Object.assign(staged, patch);
    else publish(patch, action);
  }

  function subscribe(listener: (tree: TreeSnapshot<T>) => void): () => void {
    if (disposed) return () => {};
    const unsubscribe = store.subscribe((value) => {
      if (!disposed) listener(value.tree);
    });
    const release = () => {
      if (subscriptions.delete(release)) unsubscribe();
    };
    subscriptions.add(release);
    return release;
  }

  return {
    table,
    get: () => store.get().tree,
    options: () => options,
    active: () => !disposed,
    request,
    subscribe,
    state: {
      get: () => store.get().snapshot,
      subscribe(listener: (state: NavigationSnapshot) => void) {
        return subscribe(() => listener(store.get().snapshot));
      },
    },
    run(why: TreeAction, run: () => void) {
      if (disposed) return;
      const previousAction = action;
      action = why;
      staged = {};
      try {
        run();
        const patch = staged;
        staged = undefined;
        publish(patch, why);
      } finally {
        staged = undefined;
        action = previousAction;
      }
    },
    change(patch: Partial<TreeState>, why: TreeAction = {}) {
      const next: Partial<NavigationSnapshot> = {};
      if (patch.highlighted !== undefined) next.highlighted = patch.highlighted;
      if (patch.anchor !== undefined) next.anchor = patch.anchor;
      if (patch.expanded !== undefined) next.expanded = keyState(patch.expanded);
      if (patch.selected !== undefined) next.rowSelection = keyState(patch.selected);
      if (staged) Object.assign(staged, next);
      else publish(next, why);
    },
    update: (next: Partial<NavigationOptions<T>>) => publish({}, { reason: "items-changed" }, next),
    dispose() {
      if (disposed) return;
      disposed = true;
      queued.length = 0;
      subscription.unsubscribe();
      for (const release of subscriptions) release();
      subscriptions.clear();
    },
  };
}

export type NavigationModel<T extends RowData> = ReturnType<typeof createNavigationModel<T>>;
