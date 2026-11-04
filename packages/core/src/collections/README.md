# Collections

Import the engine from `@densedash/core`. All functions are synchronous and pure;
callers own the source, state, keyboard handling and typeahead buffer.

```ts
import { flatten, move, selectRange } from "@densedash/core";

const source = {
  roots: [{ id: "alice", name: "Alice", score: 12 }],
  getKey: (item: { id: string }) => item.id,
  getTextValue: (item: { name: string }) => item.name,
};
const rows = flatten(source, new Set<string>());
const score = rows[0]?.item.score; // number | undefined, inferred from roots
const highlighted = move(rows, null, { type: "first" });
const selected = selectRange(rows, highlighted, "alice");
```

`TreeSource<T>` infers the item type from roots; `NoInfer<T>` on the callbacks
prevents a getter accepting fewer fields from narrowing that type. It accepts a
key getter and optional child, disabled and text getters. Keys must be globally
unique within a source. Callbacks must be stable
and synchronous; each reachable item is visited once per flatten call. The whole
source is validated, including collapsed branches. Duplicate keys and ancestor
cycles throw errors naming the key in every environment, without an ambient dev
flag. Iterative traversal avoids call-stack limits and costs O(total items) time
and O(total keys + tree depth + visible rows) memory.

`flatten(source, expanded)` returns visible preorder `TreeRow<T>` objects. `index`
and `depth` start at zero. `parentKey` is null for roots. `posInSet` starts at one
and `setSize` counts all siblings, including disabled ones. A leaf always has
`expanded: false`. Rows also snapshot `disabled` (default false) and `textValue`
(default key), so movement needs no source callback or hidden state.

`move(rows, from, movement, { loop?: boolean })` returns a key or null. The
default is no wrapping. Next/previous counts and page sizes count enabled rows;
they must be non-negative safe integers. Zero leaves an enabled cursor in place.
A missing cursor starts from the first/last enabled row in the requested
direction. Without looping, movement clamps at the ends. First/last ignore loop.
Parent skips disabled ancestors; first child finds the first enabled direct
child. A missing structural target leaves the current enabled cursor in place.
Typeahead uses a case-insensitive text prefix, searching after the current row;
with looping it wraps through the current row last. Empty or unmatched text
leaves the current enabled cursor in place. All-disabled/empty inputs return
null. Each move costs O(visible rows), independent of the requested count.

Selection helpers return read-only sets without mutating inputs:

- `toggleSelection(rows, selected, key)` ignores missing/disabled keys.
- `selectRange(rows, anchor, to)` replaces selection with an inclusive range,
  skipping disabled rows. A missing anchor selects only the target; a missing
  target yields an empty set. Callers retain the anchor between range changes.
- `selectAll(rows)` includes every visible enabled key.
- `clearSelection()` returns an empty set. Callers clear the anchor as needed.

`reconcile(prev, next, state)` keeps an enabled cursor on its key across inserts
and reorders. If it disappears or becomes disabled, the closest enabled old
neighbour that survives wins, with the following row winning ties. If none
survive, use the first enabled new row. A null cursor stays null. Selection and
anchor are pruned against the supplied visible rows; collapsed selections are
therefore removed. Expansion is retained, including hidden descendants. To
reconcile data removal without pruning collapsed selection, supply fully
expanded rows. Reconciliation costs O(prev rows + next rows + selected keys).
