# Deprecated tree compatibility adapter

`createTree(kernel, options)` now delegates to the [TanStack navigation engine](../navigation/README.md).
It maps `roots` / `getKey` / `getChildren` to `data` / `getRowId` / `getSubRows`,
and maps set-based expanded/selected controls and row snapshots for the current
React adapter. It preserves the prop getter shapes, command IDs, scope ownership,
controlled callbacks and disposal contract. Expand on an expanded row or a leaf
now does nothing (DD-24).

This export and its `Tree*` snapshot types are deprecated. DD-30/DD-31 migrate the
React consumers and remove this adapter. New framework-neutral consumers should
use `createNavigableTable` and TanStack row/column/state APIs.
