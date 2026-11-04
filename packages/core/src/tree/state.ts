import { flatten } from "../collections/flatten.js";
import { reconcile } from "../collections/reconcile.js";
import type { Key, TreeState } from "../collections/types.js";
import type { ChangeDetails } from "../controllable.js";
import type { StorePort } from "../ports/store.js";
import type { TreeAction, TreeChangeReason, TreeOptions, TreeSnapshot } from "./types.js";

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

function sameKeys(left: ReadonlySet<Key>, right: ReadonlySet<Key>): boolean {
  if (left.size !== right.size) return false;
  for (const key of left) if (!right.has(key)) return false;
  return true;
}

function controlled<T>(state: TreeState, options: TreeOptions<T>): TreeState {
  return {
    ...state,
    highlighted:
      options.highlighted?.value !== undefined ? options.highlighted.value : state.highlighted,
    selected: options.selected?.value ?? state.selected,
    expanded: options.expanded?.value ?? state.expanded,
  };
}

/** Owns publication, controlled authority, cancellation and subscription cleanup. */
export function createTreeState<T>(port: StorePort, initial: TreeOptions<T>) {
  let options = initial;
  const defaults: TreeState = {
    highlighted: initial.highlighted?.defaultValue ?? null,
    selected: initial.selected?.defaultValue ?? new Set(),
    expanded: initial.expanded?.defaultValue ?? new Set(),
    anchor: null,
  };
  const state = controlled(defaults, initial);
  const rows = flatten(initial, state.expanded);
  const reconciled = controlled(reconcile([], rows, state), initial);
  const store = port.create<TreeSnapshot<T>>({ ...reconciled, rows });
  const subscriptions = new Set<() => void>();
  let disposed = false;
  let revision = 0;
  let notifying = false;
  let queuedUpdates: Partial<TreeOptions<T>>[] = [];

  function publish(
    patch: Partial<TreeState>,
    action: TreeAction,
    update?: Partial<TreeOptions<T>>,
  ): void {
    if (disposed) return;
    const version = ++revision;
    const previous = store.get();
    const nextOptions = update === undefined ? options : { ...options, ...update };
    const baseline = update === undefined ? previous : controlled(previous, nextOptions);
    const requested = { ...baseline, ...patch };
    // Controlled expansion governs visibility even when an unacknowledged request asks otherwise.
    const expanded = nextOptions.expanded?.value ?? requested.expanded;
    const nextRows =
      update === undefined && sameKeys(previous.expanded, expanded)
        ? previous.rows
        : flatten(nextOptions, expanded);
    const next = reconcile(previous.rows, nextRows, requested);
    const wasNotifying = notifying;
    notifying = true;
    try {
      const details = changeDetails(action);
      if (!sameKeys(baseline.expanded, next.expanded))
        nextOptions.expanded?.onChange?.(next.expanded, details);
      if (disposed || revision !== version) return;
      if (!details.canceled && baseline.highlighted !== next.highlighted)
        nextOptions.highlighted?.onChange?.(next.highlighted, details);
      if (disposed || revision !== version) return;
      if (!details.canceled && !sameKeys(baseline.selected, next.selected))
        nextOptions.selected?.onChange?.(next.selected, details);
      if (disposed || revision !== version) return;
      if (details.canceled && update === undefined) return;
      options = nextOptions;
      const accepted = controlled(details.canceled ? previous : next, options);
      // Data updates still publish their rows when a state-change callback cancels reconciliation.
      const visible =
        accepted.expanded === expanded ? nextRows : flatten(options, accepted.expanded);
      store.set({ ...accepted, rows: visible });
    } finally {
      notifying = wasNotifying;
      if (!notifying) {
        const updates = queuedUpdates;
        queuedUpdates = [];
        for (const nextOptions of updates) publish({}, { reason: "items-changed" }, nextOptions);
      }
    }
  }

  return {
    get: () => store.get(),
    options: () => options,
    active: () => !disposed,
    change: (patch: Partial<TreeState>, action: TreeAction = {}) => publish(patch, action),
    update(next: Partial<TreeOptions<T>>) {
      if (disposed) return;
      // Finish all fields and the anchor before publishing synchronous owner acknowledgements.
      if (notifying) queuedUpdates.push(next);
      else publish({}, { reason: "items-changed" }, next);
    },
    subscribe(listener: (state: TreeSnapshot<T>) => void): () => void {
      if (disposed) return () => {};
      const unsubscribe = store.subscribe((next) => {
        if (!disposed) listener(next);
      });
      const release = () => {
        if (!subscriptions.delete(release)) return;
        unsubscribe();
      };
      subscriptions.add(release);
      return release;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      queuedUpdates = [];
      for (const release of subscriptions) release();
      subscriptions.clear();
    },
  };
}

export type TreeModel<T> = ReturnType<typeof createTreeState<T>>;
