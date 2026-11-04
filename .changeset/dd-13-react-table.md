---
"@densedash/react": minor
"@densedash/css": minor
"@densedash/core": minor
---

Add the React `Table` parts (`Root`, `Header`, `HeaderCell`, `Viewport`, `Row`, `Cell`, `Toggle`, `Value`) with `useTable` and the `columns<T>()` helper. `column.accessor("pnl", …)` types `format` and `sort` with the field's type; `column.cell(id, fn, …)` computes a value. Tables reuse the tree core and the Tree viewport (virtualizer, live-feed anchoring): rows nest as a `treegrid` when `getChildren` is given and are a flat `grid` otherwise. Column kinds are inferred from the data; numeric columns align to the end with tabular figures, and missing or mistyped values render empty. `getSortedRows` sorts roots and each parent's children; `table.sort` (S) cycles the chosen column's sort and `table.next-column` (Shift+S) chooses the next one, both in `tradingPreset`. Style tables with `@densedash/css/components/table.css`. The tree core gains a `grid` mode, and `grid`/`treegrid` parts use `table-root`, `table-row` and `table-toggle` slots.
