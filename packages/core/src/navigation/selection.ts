import type { Key, TreeRow } from "../collections/types.js";

/**
 * Replace selection with an inclusive visible range, excluding disabled rows.
 * A missing anchor selects only the target; a missing target yields an empty set.
 */
export function selectRange<T>(
  rows: readonly TreeRow<T>[],
  anchor: Key | null,
  to: Key,
): ReadonlySet<Key> {
  const targetIndex = rows.findIndex((row) => row.key === to);
  const selected = new Set<Key>();
  if (targetIndex < 0) return selected;
  const anchorIndex = anchor === null ? -1 : rows.findIndex((row) => row.key === anchor);
  const start = anchorIndex < 0 ? targetIndex : Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  for (let index = start; index <= end; index++) {
    const row = rows[index]!;
    if (!row.disabled) selected.add(row.key);
  }
  return selected;
}
