---
"@densedash/core": minor
"@densedash/react": minor
---

Breaking 0.2.0 migration: `useTree`, `useList`, `Tree.*` and `List.*` run on `createNavigableTable`, so TanStack Table owns their rows, expansion and selection. Options change from `roots` / `getKey` / `getChildren` to `data` / `getRowId` / `getSubRows`, and the `expanded` and `selected` controls become TanStack's `expanded` (`true` or `{ [id]: true }`) and `rowSelection` (`{ [id]: true }`). A viewport's row function receives TanStack's row: read `row.original` instead of `row.item` and `row.id` instead of `row.key`. The handle's `table` is the TanStack table (`null` until the root mounts), and `state` holds the navigation state plus the visible `rows`. `useList` with `getSubRows` makes a nested list, and `List` now exports `Indent` and `Toggle`. Parts that never read the item type take the new covariant `TreeHandleBase<T>`. `Table.Viewport`'s row function also receives TanStack's row; `useTable` keeps its options until Table moves to TanStack.

Remove core's deprecated `createTree` adapter, the `Tree`, `TreeOptions`, `TreeBaseOptions`, `ListBaseOptions` and `TreeSnapshot` types and the collection snapshot types (`Key`, `Move`, `MoveOptions`, `TreeRow`, `TreeSource`, `TreeState`). Core re-exports TanStack's `ExpandedState`, `RowSelectionState` and `RowData` types.
