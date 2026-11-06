---
"@densedash/react": patch
---

Fix four Table viewport bugs. Appending rows at the end of the list now keeps the highlighted row in place on the first painted frame: viewports pass the new row count to their virtualizer before the render that shows the rows. Changing a table's columns or nesting no longer logs "useInsertionEffect must not schedule updates". A `Table.Row` takes the highlight from the pointer only when the pointer moves into it, not when a sort, scroll or insertion brings it under a pointer that is still or moving within the row. The built-in virtualizer keys measured row heights by row id, so a tall row keeps its height and position when rows are inserted above it or sorted. `ViewportMeasurements` gains an optional `rowKey`.
