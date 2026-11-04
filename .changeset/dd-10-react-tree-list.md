---
"@densedash/react": minor
"@densedash/css": minor
"@densedash/core": minor
---

Add the React `Tree` and `List` parts (`Root`, `Viewport`, `Row`, plus `Tree.Indent` and `Tree.Toggle`) with `useTree` and `useList`, which infer `row.item` from `roots`. The viewport mounts every row by default and accepts a `virtualizer` strategy (`Virtualizer`, `ViewportRange`, `ViewportMeasurements`). It keeps the highlighted row in view and holds its screen position when rows are added above it. Style them with `@densedash/css/components/tree.css`. In `tradingPreset`, Control+U and Control+D now jump to the first and last rows, and PageUp and PageDown page. Tree prop getters look rows up by key in constant time.
