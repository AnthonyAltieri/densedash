---
"@densedash/react": minor
"@densedash/plugin-tanstack-virtual": minor
---

Variable row heights: the `Virtualizer` interface gains an optional `measure(element, index)`, which the viewport calls for every mounted row after each render, before anchoring and following the highlight. `tanstackVirtual({ estimateSize, measure: true })` implements it with TanStack's `measureElement`, which also follows later size changes; without `measure`, every row keeps the estimated height as before.

Document that `Tree.Root` renders rows after mount (server rendering emits the root and an empty viewport) and why `Table.Value` exists alongside `Table.Cell`.
