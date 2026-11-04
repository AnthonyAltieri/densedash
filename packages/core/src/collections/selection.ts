import type { Key, TreeRow } from "./types.js";

/** Toggle a visible enabled key, preserving the caller's selected set. */
export function toggleSelection<T>(
  rows: readonly TreeRow<T>[],
  selected: ReadonlySet<Key>,
  key: Key,
): ReadonlySet<Key> {
  const row = rows.find((candidate) => candidate.key === key);
  if (!row || row.disabled) return selected;
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

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

/** Select every visible enabled row. */
export function selectAll<T>(rows: readonly TreeRow<T>[]): ReadonlySet<Key> {
  const selected = new Set<Key>();
  for (const row of rows) {
    if (!row.disabled) selected.add(row.key);
  }
  return selected;
}

export function clearSelection(): ReadonlySet<Key> {
  return new Set<Key>();
}
