---
"@densedash/core": minor
"@densedash/css": minor
"@densedash/react": minor
"@densedash/plugin-tanstack-virtual": minor
---

Tabs: `tabs.next` and `tabs.prev` commands (ArrowRight and ArrowLeft in `tradingPreset`) select and focus the neighbouring enabled tab while focus is in the tab list, and tabs use a roving tab stop: only the selected tab is in the page's tab order.

Table: `Table.Viewport` renders the header row as its first child (its new `header` prop, default `<Table.Header />`, `null` for none), and the stylesheet makes it `position: sticky`, so the header and rows share one scroll container and stay aligned when columns scroll sideways. Remove a `<Table.Header />` placed before the viewport. `Tree.Viewport` accepts the same `header` prop; `ViewportMeasurements.start` reports its height to virtualizers, and `tanstackVirtual` uses it as TanStack's `scrollMargin` and `scrollPaddingStart`. The CSS lint allows a bare `0`, and a new `--dd-z-sticky` token stacks sticky parts.

Tree: `createTree` and `useTree` accept `labels: { expand, collapse }` for the toggle's accessible names, which default to "Expand" and "Collapse".
