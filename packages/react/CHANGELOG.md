# @densedash/react

## 0.3.0

### Minor Changes

- [#63](https://github.com/densedash/densedash/pull/63) [`e8bd989`](https://github.com/densedash/densedash/commit/e8bd98960e336fca126c7f6370b5424d111f8aeb) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Bind `tree.parent` to `U` in `treePreset` and `Shift+U` in `shiftedTreePreset`, so page-wide Tree and List layers can return to a parent row. Top-level rows stay highlighted. Keep secondary hints hidden by default in named layers too; pass `all` to include the parent key in legends.

### Patch Changes

- Updated dependencies [[`9fc91be`](https://github.com/densedash/densedash/commit/9fc91beaaebdd9560f5f21fa7b60af26993380eb), [`e8bd989`](https://github.com/densedash/densedash/commit/e8bd98960e336fca126c7f6370b5424d111f8aeb)]:
  - @densedash/core@0.3.0

## 0.2.0

### Minor Changes

- [#39](https://github.com/densedash/densedash/pull/39) [`02da025`](https://github.com/densedash/densedash/commit/02da025d7a1faa731ef9760fa9e0c5b67bb9a134) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add `AppShell`, a keyboard-driven three-pane shell: `AppShell.Root` (the page's key scope), `AppShell.Panes`, `AppShell.Sidebar` (a Tree of pages and nested groups; the app passes the open `page` and gets `onPageChange(item)` when the cursor lands on one), `AppShell.List` (a nested List with a heading, breadcrumb and its layer's keys), `AppShell.Detail` (numbered Tabs under an app-supplied header) and `AppShell.Footer` (the live key legend and a status slot), plus `AppShell.Label` and `AppShell.Count` for row content. Every pane takes the app's `useTree`/`useList` handle and key layers, so the cursor and expanded rows stay in each instance's TanStack state and the shell keeps no navigation state. Rows ignore pointer hover, so the cursor moves only by key, click or the app. New stylesheet `components/app-shell.css`; new tokens `--dd-color-selection-muted` (with `--dd-base-blue-50`), `--dd-font-weight-semibold`, `--dd-font-weight-bold` and the `--dd-app-shell-*` sizes.

- [#47](https://github.com/densedash/densedash/pull/47) [`72c9578`](https://github.com/densedash/densedash/commit/72c9578e32e8ba0d3ce6882f0165a8634337a713) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Breaking changes in 0.2.0, with the code to change. Each one is also described in its own entry.

  **`Table.Viewport` renders the header.** Its `header` prop defaults to `<Table.Header />`, so the header row and the body share one scroll container and the header stays sticky. Remove a `<Table.Header />` placed before the viewport; pass `header={null}` for no header.

  ```tsx
  // Before
  <Table.Root table={table}>
    <Table.Header />
    <Table.Viewport table={table} />
  </Table.Root>

  // After
  <Table.Root table={table}>
    <Table.Viewport table={table} />
  </Table.Root>
  ```

  **Part props drop `defaultValue`, `defaultChecked` and `dangerouslySetInnerHTML`.** Parts render `div`s and buttons, where these attributes do nothing or replace the part's own content. Put HTML inside a child element. Component props of the same name, such as `Tabs.Root`'s `defaultValue` (the first selected tab), are unchanged.

  ```tsx
  // Before
  <Tree.Row row={row} dangerouslySetInnerHTML={{ __html: row.original.html }} />

  // After
  <Tree.Row row={row}>
    <span dangerouslySetInnerHTML={{ __html: row.original.html }} />
  </Tree.Row>
  ```

  **`Tree.Toggle` and `Tabs.Tab` drop button form attributes.** They no longer accept `disabled`, `type`, `name`, `value` (as a DOM attribute) or `form*`; both always render `type="button"`. Disable a tab with `disabled: true` on its item in `Tabs.Root`'s `items`. `Tabs.Tab`'s own `value` prop, which names its item, is unchanged. To set any other button attribute, pass it on a `render` element.

  ```tsx
  // Before
  <Tree.Toggle disabled={locked} />
  <Tabs.Tab value="orders" form="orders-form" />

  // After
  <Tree.Toggle render={<button disabled={locked} />} />
  <Tabs.Tab value="orders" render={<button form="orders-form" />} />
  ```

  **Tree, List and Table take `data`, `getRowId` and `getSubRows`.** `useTree`, `useList` and `useTable` run on TanStack Table: `roots`, `getKey` and `getChildren` become `data`, `getRowId` and `getSubRows`; `expanded` takes TanStack's `{ [id]: true }` (or `true`) instead of a `Set`, and `selected` becomes `rowSelection`. Row functions receive TanStack's row: read `row.original` instead of `row.item`, and `row.id` instead of `row.key`.

  ```tsx
  // Before
  const tree = useTree({
    roots: desks,
    getKey: (desk) => desk.id,
    getChildren: (desk) => desk.children,
    expanded: { defaultValue: new Set(["equities"]) },
  });
  <Tree.Viewport tree={tree}>
    {(row) => <Tree.Row row={row}>{row.item.label}</Tree.Row>}
  </Tree.Viewport>;

  // After
  const tree = useTree({
    data: desks,
    getRowId: (desk) => desk.id,
    getSubRows: (desk) => desk.children,
    expanded: { defaultValue: { equities: true } },
  });
  <Tree.Viewport tree={tree}>
    {(row) => <Tree.Row row={row}>{row.original.label}</Tree.Row>}
  </Tree.Viewport>;
  ```

- [#38](https://github.com/densedash/densedash/pull/38) [`eaae1b6`](https://github.com/densedash/densedash/commit/eaae1b65aad56909a7e7e44270586b80669c745f) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add labelled per-instance key layers for Tree, List, Tabs and command registrations. Layers dispatch across the page, reject duplicate keys and appear in both legends. Export shiftedTreePreset for Shift+J/K/L/H navigation.

- [#37](https://github.com/densedash/densedash/pull/37) [`0c2663a`](https://github.com/densedash/densedash/commit/0c2663a92f91c21beb0d88bb02880de778f4d869) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Built-in virtualization: `<Tree.Viewport virtual>`, `<List.Viewport virtual>` and `<Table.Viewport virtual>` mount only the rows in view with TanStack Virtual, with no setup. Rows are estimated at the viewport's computed `--dd-row-height`, read again when a `data-dd-density` attribute changes or the viewport resizes, so the estimate follows the density setting, and they are measured as they render. `virtual={{ overscan, estimateSize, measure }}` tunes it. `tanstackVirtual` and `VirtualOptions` are exported for passing the same strategy through `virtualizer={…}`, which still takes any custom `Virtualizer`; passing both `virtual` and `virtualizer` throws. `@tanstack/virtual-core` 3.19.11 is now a dependency.

- [#31](https://github.com/densedash/densedash/pull/31) [`ee39b82`](https://github.com/densedash/densedash/commit/ee39b82a58ce2eb0c4affb6b44f230af01abb778) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Make the Tree, List, Tabs, Table, Keymap, Kbd and Footer part types far cheaper to typecheck. Parts extend the new `ElementAttributes<E>` (React's attributes, ARIA attributes, handlers and ref, picked by name) instead of `Omit<ComponentPropsWithRef<…>, …>`; `useTree` and `useList` extend core's new `TreeBaseOptions` and `ListBaseOptions`; command ids use intersections instead of `Extract`. `Tree.Root`, `Tree.Row`, `Table.Root` and `Table.Row` no longer infer an item type they never read. Part props no longer accept `defaultValue`, `defaultChecked` or `dangerouslySetInnerHTML`, and the tree toggle and tab buttons no longer accept `disabled`, `type`, `name`, `value` or `form*`. `Tabs.Root` now passes a DOM `onChange` through to its element; use `onValueChange` for selection.

  Tree and Table rows use `contain: layout style` instead of `content-visibility: auto`, which made every key press check thousands of rows' visibility, and a row whose only change is its position no longer re-renders its content: `Tree.Row` subscribes to its own `aria-posinset`/`aria-setsize` and `Table.Row` to its own index for `aria-rowindex`, so an insertion re-renders those parts but no row's content. `row.index`, `row.posInSet` and `row.setSize` in a viewport's row function can therefore be stale; read positions from `tree.state`.

- [#44](https://github.com/densedash/densedash/pull/44) [`dd97f52`](https://github.com/densedash/densedash/commit/dd97f52194d5ebe1bbfde54af9fb3b5d9be97010) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - `Footer.Legend` and `AppShell.Footer` take an `order` list of item names (as `groupBy` returns them) to list first; other items keep keymap order. A plain `Footer` is now `--dd-footer-height` (30px) tall instead of 39px: `footer.css` sizes it with `box-sizing: border-box`, and the AppShell's footer override is gone. The shell matches its design more closely: 12px stroked chevrons in the sidebar and list toggles, a 14px sidebar indent step, a 6px sidebar row gap and a fainter rule between the list's child rows. New tokens `--dd-color-border-subtle`, `--dd-app-shell-row-gap`, `--dd-app-shell-indent`, `--dd-app-shell-chevron`, `--dd-app-shell-chevron-size`, `--dd-app-shell-chevron-color` and `--dd-app-shell-chevron-open-rotate`.

- [#30](https://github.com/densedash/densedash/pull/30) [`f68c3b2`](https://github.com/densedash/densedash/commit/f68c3b2582d834720d63e7d0215770ed0478f95a) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add the raised `Kbd` keycap style, a `KbdRange` part (`1–3`), and a `Footer` bar (`Footer.Root`, `Footer.Legend`, `Footer.Status`) whose legend lists the keys bound right now from the keymap. The default keyboard port's `format` now emits compact keycap labels: `⇧J` and `⌘K` on macOS, `Shift+J` and `Ctrl+K` elsewhere, and lower-case letters for unmodified keys and sequences (`j`, `g r`). New tokens: `--dd-color-surface-muted`, `--dd-color-text-secondary`, `--dd-color-border-muted`, `--dd-font-weight-medium`, and the `--dd-kbd-*` and `--dd-footer-*` sizes.

- [#33](https://github.com/densedash/densedash/pull/33) [`d386881`](https://github.com/densedash/densedash/commit/d386881fbc75411e3950fd7f09b112a6fb5e1107) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Variable row heights: the `Virtualizer` interface gains an optional `measure(element, index)`, which the viewport calls for every mounted row after each render, before anchoring and following the highlight. `tanstackVirtual({ estimateSize, measure: true })` implements it with TanStack's `measureElement`, which also follows later size changes; without `measure`, every row keeps the estimated height as before.

  Document that `Tree.Root` renders rows after mount (server rendering emits the root and an empty viewport) and why `Table.Value` exists alongside `Table.Cell`.

- [#59](https://github.com/densedash/densedash/pull/59) [`4128aa6`](https://github.com/densedash/densedash/commit/4128aa69300b20e179a07e3a9c950d2795d5e95d) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Group built-in navigation and tab shortcuts into short legend items. Commands expose group
  labels and secondary hint metadata without changing bindings. Footer.Legend and Keymap.Legend
  share grouping defaults, accept label overrides and an all option, and preserve explicit filters,
  grouping callbacks and instance layer names. AppShell.Footer forwards the legend options.

- [#26](https://github.com/densedash/densedash/pull/26) [`b09bc6f`](https://github.com/densedash/densedash/commit/b09bc6ffad007b46132f51744bc4e907311300a8) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add in-place command scope updates that preserve pending confirmation and sequence progress, and keep equal keymap snapshots stable across focus changes. Expose command enabled state and omit disabled or unbound shortcuts from React keyboard hints. Remove unused generic and application-specific trading preset bindings while retaining ids used by examples.

- [#36](https://github.com/densedash/densedash/pull/36) [`c491b60`](https://github.com/densedash/densedash/commit/c491b606722707adcf5e55846d59227615884d01) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Breaking 0.2.0 migration: `useTable` and `Table.*` run on the TanStack engine. `useTable` takes the tree's options (`data`, `getRowId`, `getSubRows`, `expanded`, `rowSelection`, `highlighted` and the navigation options) plus `columns` and `sorting`, TanStack's `[{ id, desc }]` state, instead of `roots` / `getKey` / `getChildren`, the Set-based `selected` / `expanded` controls and `sort`. TanStack sorts the rows, sub-rows within their parent; `table.sort`, `table.next-column` and header clicks drive its sorting, and the handle's `table` is the TanStack table. Read the sort and the chosen column from `table.state` (`sorting`, `chosenColumn`); `table.sorting` is gone.

  `columns<T>()` wraps TanStack's `createColumnHelper` and returns TanStack column definitions. `accessor(key, options)` replaces `accessor(key, { header, … })`, and `accessor(fn, { id, … })` replaces `cell(id, fn, …)`. A column's `sort` is `"asc"` (default), `"desc"` (descending first) or `false`, and a comparator moves to `compare`. Numeric alignment and tabular figures come from `numeric: true` instead of inferring value kinds; missing values, and non-numbers in a numeric column, still render empty and sort last. `getSortedRows`, `inferKinds`, `Column`, `ColumnKinds`, `ValueKind`, `TableSort`, `TableState` and `TableSortControl` are removed. In core, `table.sort` starts descending on a column with `sortDescFirst`.

- [#32](https://github.com/densedash/densedash/pull/32) [`72174d9`](https://github.com/densedash/densedash/commit/72174d993962b729318eaf8ef393400c34fac9b3) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Tabs: `tabs.next` and `tabs.prev` commands (ArrowRight and ArrowLeft in `tradingPreset`) select and focus the neighbouring enabled tab while focus is in the tab list, and tabs use a roving tab stop: only the selected tab is in the page's tab order.

  Table: `Table.Viewport` renders the header row as its first child (its new `header` prop, default `<Table.Header />`, `null` for none), and the stylesheet makes it `position: sticky`, so the header and rows share one scroll container and stay aligned when columns scroll sideways. Remove a `<Table.Header />` placed before the viewport. `Tree.Viewport` accepts the same `header` prop; `ViewportMeasurements.start` reports its height to virtualizers, and `tanstackVirtual` uses it as TanStack's `scrollMargin` and `scrollPaddingStart`. The CSS lint allows a bare `0`, and a new `--dd-z-sticky` token stacks sticky parts.

  Tree: `createTree` and `useTree` accept `labels: { expand, collapse }` for the toggle's accessible names, which default to "Expand" and "Collapse".

- [#43](https://github.com/densedash/densedash/pull/43) [`76c1287`](https://github.com/densedash/densedash/commit/76c12878c1cc7f9d17a4fc0befaabcb81db4bd20) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Tabs: while focus is in a tab list, `tabs.first` and `tabs.last` (Home and End in `tradingPreset`) select and focus the first and last enabled tab. In right-to-left text, `tabs.next` and `tabs.prev` (ArrowRight and ArrowLeft) follow the visual direction, read from the list's computed `direction` when the key is pressed. `Tabs.List` takes `orientation="vertical"`, sets `aria-orientation` and `data-orientation`, and in a column answers `tabs.down` and `tabs.up` (ArrowDown and ArrowUp) instead; `tabs.css` lays a vertical list out beside its panels. Several `Tabs.List`s in one `Tabs.Root` are views of the same tabs: the first mounted list keeps the existing tab ids that panels are labelled by, and each later list prefixes its tab ids with its own id, so no ids repeat.

- [#35](https://github.com/densedash/densedash/pull/35) [`d3f0406`](https://github.com/densedash/densedash/commit/d3f0406d6a88206d15a9cffdbf6bae58fc1e6e20) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Breaking 0.2.0 migration: `useTree`, `useList`, `Tree.*` and `List.*` run on `createNavigableTable`, so TanStack Table owns their rows, expansion and selection. Options change from `roots` / `getKey` / `getChildren` to `data` / `getRowId` / `getSubRows`, and the `expanded` and `selected` controls become TanStack's `expanded` (`true` or `{ [id]: true }`) and `rowSelection` (`{ [id]: true }`). A viewport's row function receives TanStack's row: read `row.original` instead of `row.item` and `row.id` instead of `row.key`. The handle's `table` is the TanStack table (`null` until the root mounts), and `state` holds the navigation state plus the visible `rows`. `useList` with `getSubRows` makes a nested list, and `List` now exports `Indent` and `Toggle`. Parts that never read the item type take the new covariant `TreeHandleBase<T>`. `Table.Viewport`'s row function also receives TanStack's row.

  Remove core's deprecated `createTree` adapter, the `Tree`, `TreeOptions`, `TreeBaseOptions`, `ListBaseOptions` and `TreeSnapshot` types and the collection snapshot types (`Key`, `Move`, `MoveOptions`, `TreeRow`, `TreeSource`, `TreeState`). Core re-exports TanStack's `ExpandedState`, `RowSelectionState` and `RowData` types.

### Patch Changes

- [#41](https://github.com/densedash/densedash/pull/41) [`5d91f44`](https://github.com/densedash/densedash/commit/5d91f447eacd3b215b23ab0b2052caddb36f1184) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Reduce type instantiations for kernel options, resolved ports and `mergeProps` element props while preserving inference, accepted options and emitted JavaScript.

- [#48](https://github.com/densedash/densedash/pull/48) [`cf6a07f`](https://github.com/densedash/densedash/commit/cf6a07fe4f15477413d6dd2c1c17eaba94300620) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Make inserting a row into a Tree or List with thousands of mounted rows cheaper. Rows share one subscription per tree that notifies only the rows whose highlight, selection, expansion, tab stop or set position changed, instead of one subscription per row. Unchanged rows keep their element, so React skips them without comparing props, and scroll anchoring finds the highlighted row by id instead of computing every row's element id. At 5,000 rows an insertion takes about 14 ms instead of 17 to 22 ms on a loaded host, and a key press about 4 ms instead of 7 to 10 ms.

- [#57](https://github.com/densedash/densedash/pull/57) [`6db025a`](https://github.com/densedash/densedash/commit/6db025a50d3bd2f62a3b3610697b13a1ad92d7c5) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Behavior change: `tree.collapse` now does nothing on a leaf or an already-collapsed row at any depth, preserving highlight, selection, expansion and scroll position instead of moving to the parent. This applies to Tree, nested List and nested Table, including arrow keys, shifted presets and right-to-left layouts. Expanded rows still collapse, and `tree.parent` keeps its separate command and key.

- [#61](https://github.com/densedash/densedash/pull/61) [`0966602`](https://github.com/densedash/densedash/commit/0966602f0e024005672c9b0022db21ae2294bb4b) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Release disabled command keys to other scopes and browser defaults, and enable row opening only while an onOpen handler is supplied, including React handler updates. Align nested table toggles with their cell text at both densities.

- [#46](https://github.com/densedash/densedash/pull/46) [`22afd05`](https://github.com/densedash/densedash/commit/22afd05294c4e4303f7f06c11a4d84e9c3c64648) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Fix four Table viewport bugs. Appending rows at the end of the list now keeps the highlighted row in place on the first painted frame: viewports pass the new row count to their virtualizer before the render that shows the rows. Changing a table's columns or nesting no longer logs "useInsertionEffect must not schedule updates". A `Table.Row` takes the highlight from the pointer only when the pointer moves into it, not when a sort, scroll or insertion brings it under a pointer that is still or moving within the row. The built-in virtualizer keys measured row heights by row id, so a tall row keeps its height and position when rows are inserted above it or sorted. `ViewportMeasurements` gains an optional `rowKey`.

- [#29](https://github.com/densedash/densedash/pull/29) [`b0f6d30`](https://github.com/densedash/densedash/commit/b0f6d3063f2992c6307d0b1ecbb47426ae1fc3a4) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Keep the highlighted row visible when reorders or scroll commands run in the same frame, while preserving the viewport anchor during live updates.

- [#45](https://github.com/densedash/densedash/pull/45) [`d8ca710`](https://github.com/densedash/densedash/commit/d8ca710f04961f347d23f61604df069dce909b1f) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Export treePreset for j/k/l/h navigation and use it by default for Tree and List key layers. Label-only layers no longer bind Space or Enter across the page, preserving native button activation. Instances without keys retain focus-bound navigation, and explicit layer presets and overrides remain supported.
- Updated dependencies [[`eaae1b6`](https://github.com/densedash/densedash/commit/eaae1b65aad56909a7e7e44270586b80669c745f), [`ee39b82`](https://github.com/densedash/densedash/commit/ee39b82a58ce2eb0c4affb6b44f230af01abb778), [`5d91f44`](https://github.com/densedash/densedash/commit/5d91f447eacd3b215b23ab0b2052caddb36f1184), [`6db025a`](https://github.com/densedash/densedash/commit/6db025a50d3bd2f62a3b3610697b13a1ad92d7c5), [`f68c3b2`](https://github.com/densedash/densedash/commit/f68c3b2582d834720d63e7d0215770ed0478f95a), [`4128aa6`](https://github.com/densedash/densedash/commit/4128aa69300b20e179a07e3a9c950d2795d5e95d), [`b09bc6f`](https://github.com/densedash/densedash/commit/b09bc6ffad007b46132f51744bc4e907311300a8), [`0966602`](https://github.com/densedash/densedash/commit/0966602f0e024005672c9b0022db21ae2294bb4b), [`c491b60`](https://github.com/densedash/densedash/commit/c491b606722707adcf5e55846d59227615884d01), [`72174d9`](https://github.com/densedash/densedash/commit/72174d993962b729318eaf8ef393400c34fac9b3), [`76c1287`](https://github.com/densedash/densedash/commit/76c12878c1cc7f9d17a4fc0befaabcb81db4bd20), [`2c5b9bf`](https://github.com/densedash/densedash/commit/2c5b9bff57be8dc9a2b39bcfd6db965b10b2d7f0), [`d1baf4c`](https://github.com/densedash/densedash/commit/d1baf4cf68f717a28d920142026f3e8b759b5ffe), [`d3f0406`](https://github.com/densedash/densedash/commit/d3f0406d6a88206d15a9cffdbf6bae58fc1e6e20), [`d8ca710`](https://github.com/densedash/densedash/commit/d8ca710f04961f347d23f61604df069dce909b1f)]:
  - @densedash/core@0.2.0

## 0.1.1

### Patch Changes

- [#24](https://github.com/densedash/densedash/pull/24) [`9034385`](https://github.com/densedash/densedash/commit/90343853812c90d7134431cefffc1fef610d5756) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Publish with npm provenance from densedash/densedash.
- Updated dependencies [[`9034385`](https://github.com/densedash/densedash/commit/90343853812c90d7134431cefffc1fef610d5756)]:
  - @densedash/core@0.1.1

## 0.1.0

### Minor Changes

- [#15](https://github.com/AnthonyAltieri/densedash/pull/15) [`26982f2`](https://github.com/AnthonyAltieri/densedash/commit/26982f2fcd4fd871667e16bb133f4c53ac88e0ac) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add the React `Tree` and `List` parts (`Root`, `Viewport`, `Row`, plus `Tree.Indent` and `Tree.Toggle`) with `useTree` and `useList`, which infer `row.item` from `roots`. The viewport mounts every row by default and accepts a `virtualizer` strategy (`Virtualizer`, `ViewportRange`, `ViewportMeasurements`). It keeps the highlighted row in view and holds its screen position when rows are added above it. Style them with `@densedash/css/components/tree.css`. In `tradingPreset`, Control+U and Control+D now jump to the first and last rows, and PageUp and PageDown page. Tree prop getters look rows up by key in constant time.

- [#13](https://github.com/AnthonyAltieri/densedash/pull/13) [`6d6cfb2`](https://github.com/AnthonyAltieri/densedash/commit/6d6cfb2c5a0c08186c82ceb63d246ac6e22e8e01) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add `Tabs.Root`, `Tabs.List`, `Tabs.Tab` and `Tabs.Panel` to the React adapter: controlled or uncontrolled tabs whose values are inferred from `items`, with number keys that select tabs through the `tabs.select.1` … `tabs.select.9` commands of the focused group. `tradingPreset` binds those commands to 1–9, `commands.keys(id)` reads a command's current keys, and `@densedash/css/components/tabs.css` styles the parts.

- [#17](https://github.com/AnthonyAltieri/densedash/pull/17) [`1935c0d`](https://github.com/AnthonyAltieri/densedash/commit/1935c0d68f6c7063728059feea16dfed2fb02c7a) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add the React `Table` parts (`Root`, `Header`, `HeaderCell`, `Viewport`, `Row`, `Cell`, `Toggle`, `Value`) with `useTable` and the `columns<T>()` helper. `column.accessor("pnl", …)` types `format` and `sort` with the field's type; `column.cell(id, fn, …)` computes a value. Tables reuse the tree core and the Tree viewport (virtualizer, live-feed anchoring): rows nest as a `treegrid` when `getChildren` is given and are a flat `grid` otherwise. Column kinds are inferred from the data; numeric columns align to the end with tabular figures, and missing or mistyped values render empty. `getSortedRows` sorts roots and each parent's children; `table.sort` (S) cycles the chosen column's sort and `table.next-column` (Shift+S) chooses the next one, both in `tradingPreset`. Style tables with `@densedash/css/components/table.css`. The tree core gains a `grid` mode, and `grid`/`treegrid` parts use `table-root`, `table-row` and `table-toggle` slots.

- [#12](https://github.com/AnthonyAltieri/densedash/pull/12) [`c355145`](https://github.com/AnthonyAltieri/densedash/commit/c3551450f758b5500e99d6960a25a1664fedcb7b) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add the React adapter foundation: `Densedash.Provider`, `useKernel`, `useStore`, `useRender`, `mergeProps` with `preventDensedashHandler`, `normalizeProps` and `useCommands`, plus the keymap parts `Keymap.Scope`, `Keymap.Legend`, `Keymap.ChordHint`, `Keymap.ConfirmPrompt` and `Kbd`. Ship their styles as `@densedash/css/components/<part>.css`, keyed on `data-slot` and state attributes. React 19 is a peer dependency.

### Patch Changes

- [#16](https://github.com/AnthonyAltieri/densedash/pull/16) [`06de19a`](https://github.com/AnthonyAltieri/densedash/commit/06de19a94b7f9f4f82793f0239b135aa94ebd030) Thanks [@AnthonyAltieri](https://github.com/AnthonyAltieri)! - Add a per-viewport TanStack Virtual strategy for Tree and List, with scroll/resize subscriptions and spacer geometry. Let React viewports use optional row offsets to preserve data anchors after virtualized rows unmount, and sync measurements before following the cursor.
- Updated dependencies [[`26982f2`](https://github.com/AnthonyAltieri/densedash/commit/26982f2fcd4fd871667e16bb133f4c53ac88e0ac), [`6d6cfb2`](https://github.com/AnthonyAltieri/densedash/commit/6d6cfb2c5a0c08186c82ceb63d246ac6e22e8e01), [`1935c0d`](https://github.com/AnthonyAltieri/densedash/commit/1935c0d68f6c7063728059feea16dfed2fb02c7a), [`49ef38d`](https://github.com/AnthonyAltieri/densedash/commit/49ef38d560b4cdf4024a19b05142fddda7c3d631), [`ca7917a`](https://github.com/AnthonyAltieri/densedash/commit/ca7917aefe450e9c138926f5df6973f9c2348f37), [`446340c`](https://github.com/AnthonyAltieri/densedash/commit/446340c1b17200307edfc3e6982182e61652d30a), [`ed22c7e`](https://github.com/AnthonyAltieri/densedash/commit/ed22c7ec40f9ff1a15229c273d118b84f5b8f104), [`0c4e194`](https://github.com/AnthonyAltieri/densedash/commit/0c4e1947c2a9802b22088f53a58640a6df642b2e), [`c27a59c`](https://github.com/AnthonyAltieri/densedash/commit/c27a59cde19dc7947c0e3c9055153cdc3561f2fc)]:
  - @densedash/core@0.1.0
