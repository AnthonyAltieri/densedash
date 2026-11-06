# @densedash/plugin-tanstack-virtual

## 0.2.1

### Patch Changes

- Updated dependencies [[`e8bd989`](https://github.com/densedash/densedash/commit/e8bd98960e336fca126c7f6370b5424d111f8aeb)]:
  - @densedash/react@0.3.0

## 0.2.0

### Minor Changes

- [#33](https://github.com/densedash/densedash/pull/33) [`d386881`](https://github.com/densedash/densedash/commit/d386881fbc75411e3950fd7f09b112a6fb5e1107) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Variable row heights: the `Virtualizer` interface gains an optional `measure(element, index)`, which the viewport calls for every mounted row after each render, before anchoring and following the highlight. `tanstackVirtual({ estimateSize, measure: true })` implements it with TanStack's `measureElement`, which also follows later size changes; without `measure`, every row keeps the estimated height as before.

  Document that `Tree.Root` renders rows after mount (server rendering emits the root and an empty viewport) and why `Table.Value` exists alongside `Table.Cell`.

- [#32](https://github.com/densedash/densedash/pull/32) [`72174d9`](https://github.com/densedash/densedash/commit/72174d993962b729318eaf8ef393400c34fac9b3) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Tabs: `tabs.next` and `tabs.prev` commands (ArrowRight and ArrowLeft in `tradingPreset`) select and focus the neighbouring enabled tab while focus is in the tab list, and tabs use a roving tab stop: only the selected tab is in the page's tab order.

  Table: `Table.Viewport` renders the header row as its first child (its new `header` prop, default `<Table.Header />`, `null` for none), and the stylesheet makes it `position: sticky`, so the header and rows share one scroll container and stay aligned when columns scroll sideways. Remove a `<Table.Header />` placed before the viewport. `Tree.Viewport` accepts the same `header` prop; `ViewportMeasurements.start` reports its height to virtualizers, and `tanstackVirtual` uses it as TanStack's `scrollMargin` and `scrollPaddingStart`. The CSS lint allows a bare `0`, and a new `--dd-z-sticky` token stacks sticky parts.

  Tree: `createTree` and `useTree` accept `labels: { expand, collapse }` for the toggle's accessible names, which default to "Expand" and "Collapse".

### Patch Changes

- [#37](https://github.com/densedash/densedash/pull/37) [`0c2663a`](https://github.com/densedash/densedash/commit/0c2663a92f91c21beb0d88bb02880de778f4d869) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Deprecated: virtualization is built into `@densedash/react`. Pass `virtual` to a viewport instead. This final release re-exports `tanstackVirtual` from `@densedash/react` as a thin wrapper that keeps the earlier `measure: false` default, and `TanstackVirtualOptions` as an alias of `VirtualOptions`; `estimateSize` is now optional and defaults to the viewport's `--dd-row-height`. It no longer depends on `@tanstack/virtual-core` or `@densedash/core`.

- [#29](https://github.com/densedash/densedash/pull/29) [`b0f6d30`](https://github.com/densedash/densedash/commit/b0f6d3063f2992c6307d0b1ecbb47426ae1fc3a4) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Keep the highlighted row visible when reorders or scroll commands run in the same frame, while preserving the viewport anchor during live updates.
- Updated dependencies [[`02da025`](https://github.com/densedash/densedash/commit/02da025d7a1faa731ef9760fa9e0c5b67bb9a134), [`72c9578`](https://github.com/densedash/densedash/commit/72c9578e32e8ba0d3ce6882f0165a8634337a713), [`eaae1b6`](https://github.com/densedash/densedash/commit/eaae1b65aad56909a7e7e44270586b80669c745f), [`0c2663a`](https://github.com/densedash/densedash/commit/0c2663a92f91c21beb0d88bb02880de778f4d869), [`ee39b82`](https://github.com/densedash/densedash/commit/ee39b82a58ce2eb0c4affb6b44f230af01abb778), [`5d91f44`](https://github.com/densedash/densedash/commit/5d91f447eacd3b215b23ab0b2052caddb36f1184), [`cf6a07f`](https://github.com/densedash/densedash/commit/cf6a07fe4f15477413d6dd2c1c17eaba94300620), [`6db025a`](https://github.com/densedash/densedash/commit/6db025a50d3bd2f62a3b3610697b13a1ad92d7c5), [`dd97f52`](https://github.com/densedash/densedash/commit/dd97f52194d5ebe1bbfde54af9fb3b5d9be97010), [`f68c3b2`](https://github.com/densedash/densedash/commit/f68c3b2582d834720d63e7d0215770ed0478f95a), [`d386881`](https://github.com/densedash/densedash/commit/d386881fbc75411e3950fd7f09b112a6fb5e1107), [`4128aa6`](https://github.com/densedash/densedash/commit/4128aa69300b20e179a07e3a9c950d2795d5e95d), [`b09bc6f`](https://github.com/densedash/densedash/commit/b09bc6ffad007b46132f51744bc4e907311300a8), [`0966602`](https://github.com/densedash/densedash/commit/0966602f0e024005672c9b0022db21ae2294bb4b), [`22afd05`](https://github.com/densedash/densedash/commit/22afd05294c4e4303f7f06c11a4d84e9c3c64648), [`b0f6d30`](https://github.com/densedash/densedash/commit/b0f6d3063f2992c6307d0b1ecbb47426ae1fc3a4), [`c491b60`](https://github.com/densedash/densedash/commit/c491b606722707adcf5e55846d59227615884d01), [`72174d9`](https://github.com/densedash/densedash/commit/72174d993962b729318eaf8ef393400c34fac9b3), [`76c1287`](https://github.com/densedash/densedash/commit/76c12878c1cc7f9d17a4fc0befaabcb81db4bd20), [`d3f0406`](https://github.com/densedash/densedash/commit/d3f0406d6a88206d15a9cffdbf6bae58fc1e6e20), [`d8ca710`](https://github.com/densedash/densedash/commit/d8ca710f04961f347d23f61604df069dce909b1f)]:
  - @densedash/react@0.2.0

## 0.1.1

### Patch Changes

- [#24](https://github.com/densedash/densedash/pull/24) [`9034385`](https://github.com/densedash/densedash/commit/90343853812c90d7134431cefffc1fef610d5756) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Publish with npm provenance from densedash/densedash.
- Updated dependencies [[`9034385`](https://github.com/densedash/densedash/commit/90343853812c90d7134431cefffc1fef610d5756)]:
  - @densedash/core@0.1.1
  - @densedash/react@0.1.1

## 0.1.0

### Minor Changes

- [#16](https://github.com/AnthonyAltieri/densedash/pull/16) [`06de19a`](https://github.com/AnthonyAltieri/densedash/commit/06de19a94b7f9f4f82793f0239b135aa94ebd030) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add a per-viewport TanStack Virtual strategy for Tree and List, with scroll/resize subscriptions and spacer geometry. Let React viewports use optional row offsets to preserve data anchors after virtualized rows unmount, and sync measurements before following the cursor.

### Patch Changes

- Updated dependencies [[`26982f2`](https://github.com/AnthonyAltieri/densedash/commit/26982f2fcd4fd871667e16bb133f4c53ac88e0ac), [`6d6cfb2`](https://github.com/AnthonyAltieri/densedash/commit/6d6cfb2c5a0c08186c82ceb63d246ac6e22e8e01), [`1935c0d`](https://github.com/AnthonyAltieri/densedash/commit/1935c0d68f6c7063728059feea16dfed2fb02c7a), [`49ef38d`](https://github.com/AnthonyAltieri/densedash/commit/49ef38d560b4cdf4024a19b05142fddda7c3d631), [`ca7917a`](https://github.com/AnthonyAltieri/densedash/commit/ca7917aefe450e9c138926f5df6973f9c2348f37), [`c355145`](https://github.com/AnthonyAltieri/densedash/commit/c3551450f758b5500e99d6960a25a1664fedcb7b), [`446340c`](https://github.com/AnthonyAltieri/densedash/commit/446340c1b17200307edfc3e6982182e61652d30a), [`ed22c7e`](https://github.com/AnthonyAltieri/densedash/commit/ed22c7ec40f9ff1a15229c273d118b84f5b8f104), [`0c4e194`](https://github.com/AnthonyAltieri/densedash/commit/0c4e1947c2a9802b22088f53a58640a6df642b2e), [`c27a59c`](https://github.com/AnthonyAltieri/densedash/commit/c27a59cde19dc7947c0e3c9055153cdc3561f2fc), [`06de19a`](https://github.com/AnthonyAltieri/densedash/commit/06de19a94b7f9f4f82793f0239b135aa94ebd030)]:
  - @densedash/react@0.1.0
  - @densedash/core@0.1.0
