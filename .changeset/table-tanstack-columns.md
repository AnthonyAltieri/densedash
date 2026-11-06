---
"@densedash/core": minor
"@densedash/react": minor
---

Breaking 0.2.0 migration: `useTable` and `Table.*` run on the TanStack engine. `useTable` takes the tree's options (`data`, `getRowId`, `getSubRows`, `expanded`, `rowSelection`, `highlighted` and the navigation options) plus `columns` and `sorting`, TanStack's `[{ id, desc }]` state, instead of `roots` / `getKey` / `getChildren`, the Set-based `selected` / `expanded` controls and `sort`. TanStack sorts the rows, sub-rows within their parent; `table.sort`, `table.next-column` and header clicks drive its sorting, and the handle's `table` is the TanStack table. Read the sort and the chosen column from `table.state` (`sorting`, `chosenColumn`); `table.sorting` is gone.

`columns<T>()` wraps TanStack's `createColumnHelper` and returns TanStack column definitions. `accessor(key, options)` replaces `accessor(key, { header, … })`, and `accessor(fn, { id, … })` replaces `cell(id, fn, …)`. A column's `sort` is `"asc"` (default), `"desc"` (descending first) or `false`, and a comparator moves to `compare`. Numeric alignment and tabular figures come from `numeric: true` instead of inferring value kinds; missing values, and non-numbers in a numeric column, still render empty and sort last. `getSortedRows`, `inferKinds`, `Column`, `ColumnKinds`, `ValueKind`, `TableSort`, `TableState` and `TableSortControl` are removed. In core, `table.sort` starts descending on a column with `sortDescFirst`.
