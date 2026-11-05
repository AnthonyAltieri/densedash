import type { Key, Move, MoveOptions, TreeRow } from "../collections/types.js";

/** Move by enabled rows without iterating count times, even for huge counts. */
function step<T>(
  rows: readonly TreeRow<T>[],
  fromIndex: number,
  count: number,
  direction: 1 | -1,
  loop: boolean,
): Key | null {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("Collection move count/size must be a non-negative safe integer.");
  }

  const keys: Key[] = [];
  let before = 0;
  let current = -1;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    if (row.disabled) continue;
    if (index < fromIndex) before++;
    if (index === fromIndex) current = keys.length;
    keys.push(row.key);
  }
  if (keys.length === 0) return null;
  if (count === 0) return current < 0 ? null : keys[current]!;

  let start = current;
  if (current < 0) {
    start =
      fromIndex < 0 ? (direction === 1 ? -1 : keys.length) : direction === 1 ? before - 1 : before;
  }
  // Reduce before addition so even MAX_SAFE_INTEGER stays arithmetically exact.
  const distance = loop ? count % keys.length : Math.min(count, keys.length);
  const target = start + direction * distance;
  const bounded = loop
    ? ((target % keys.length) + keys.length) % keys.length
    : Math.max(0, Math.min(keys.length - 1, target));
  return keys[bounded]!;
}

/**
 * Return a key; never mutate rows or state. No target leaves the current enabled
 * key in place (or null). Counts and pages count enabled rows. Empty rows return null.
 */
export function move<T>(
  rows: readonly TreeRow<T>[],
  from: Key | null,
  movement: Move,
  { loop = false }: MoveOptions = {},
): Key | null {
  const fromIndex = from === null ? -1 : rows.findIndex((row) => row.key === from);
  const current = rows[fromIndex];
  const unchanged = current && !current.disabled ? current.key : null;

  switch (movement.type) {
    case "next":
    case "prev":
      return step(rows, fromIndex, movement.count ?? 1, movement.type === "next" ? 1 : -1, loop);
    case "page":
      return step(rows, fromIndex, movement.size, movement.direction, loop);
    case "first":
      return rows.find((row) => !row.disabled)?.key ?? null;
    case "last":
      for (let index = rows.length - 1; index >= 0; index--) {
        const row = rows[index]!;
        if (!row.disabled) return row.key;
      }
      return null;
    case "parent": {
      let parentKey = current?.parentKey;
      for (let index = fromIndex - 1; index >= 0 && parentKey != null; index--) {
        const row = rows[index]!;
        if (row.key !== parentKey) continue;
        if (!row.disabled) return row.key;
        parentKey = row.parentKey;
      }
      return unchanged;
    }
    case "firstChild":
      if (!current) return null;
      for (let index = fromIndex + 1; index < rows.length; index++) {
        const row = rows[index]!;
        if (row.depth <= current.depth) break;
        if (row.parentKey === current.key && !row.disabled) return row.key;
      }
      return unchanged;
    case "typeahead": {
      const text = movement.text.toLowerCase();
      if (text.length === 0) return unchanged;
      const end = loop ? rows.length + fromIndex + 1 : rows.length;
      for (let index = fromIndex + 1; index < end; index++) {
        const row = rows[index % rows.length]!;
        if (!row.disabled && row.textValue.toLowerCase().startsWith(text)) return row.key;
      }
      return unchanged;
    }
  }
}
