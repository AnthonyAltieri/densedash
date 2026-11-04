import type { Key, TreeRow, TreeState } from "./types.js";

/**
 * Reconcile against supplied visible rows in O(prev + next + selected).
 * Keep a live enabled cursor by key. Otherwise prefer the nearest enabled survivor
 * in the old order (following wins ties), then the first enabled new row.
 * Prune invisible selection/anchor; retain expansion for hidden descendants.
 */
export function reconcile<T>(
  prev: readonly TreeRow<T>[],
  next: readonly TreeRow<T>[],
  state: TreeState,
): TreeState {
  const existing = new Set<Key>();
  const enabled = new Set<Key>();
  for (const row of next) {
    existing.add(row.key);
    if (!row.disabled) enabled.add(row.key);
  }

  let highlighted = state.highlighted;
  if (highlighted !== null && !enabled.has(highlighted)) {
    const previousIndex = prev.findIndex((row) => row.key === highlighted);
    highlighted = null;
    if (previousIndex >= 0) {
      for (let distance = 1; distance < prev.length; distance++) {
        const following = prev[previousIndex + distance];
        const preceding = prev[previousIndex - distance];
        if (following && enabled.has(following.key)) {
          highlighted = following.key;
          break;
        }
        if (preceding && enabled.has(preceding.key)) {
          highlighted = preceding.key;
          break;
        }
      }
    }
    highlighted ??= next.find((row) => !row.disabled)?.key ?? null;
  }

  const selected = new Set<Key>();
  for (const key of state.selected) {
    if (existing.has(key)) selected.add(key);
  }

  return {
    highlighted,
    selected,
    anchor: state.anchor !== null && existing.has(state.anchor) ? state.anchor : null,
    expanded: state.expanded,
  };
}
