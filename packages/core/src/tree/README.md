# Tree core

`createTree(kernel, options)` composes the public collections, store, clock and
command APIs. It returns visible `rows`, a read-only `state` store, `commands`,
`getRootProps()`, `getRowProps(key)`, `getToggleProps(key)`, `update(options)` and
`dispose()`. Subscribe to `state` to render both state and data changes.

```ts
import { createKernel, createTree } from "@densedash/core";

const kernel = createKernel();
const tree = createTree(kernel, {
  id: "accounts",
  roots: [{ id: "cash", label: "Cash", balance: 12 }],
  getKey: (item) => item.id,
  getTextValue: (item) => item.label,
  onOpen: (item) => console.log(item.balance), // item inferred from roots
});

tree.commands.first();
tree.commands.select();
console.log(tree.rows, tree.state.get(), tree.getRowProps("cash"));
tree.update({ roots: [{ id: "cash", label: "Cash", balance: 20 }] });
tree.dispose();
kernel.dispose();
```

Pass `getChildren`, `isDisabled` and `getTextValue` as needed. Collection keys must
be globally unique, including collapsed children. All source data is validated
by `flatten`; updates reconcile the cursor, selection and anchor by key. As in
collections, invisible selection is pruned and hidden expansion is retained.

`highlighted`, `selected` and `expanded` each accept core's `Controllable` shape:
`{ value?, defaultValue?, onChange? }`. Highlight is a key or null; selection and
expansion are `ReadonlySet<string>`. Defaults apply at creation. Controlled
values remain authoritative until the owner calls `update` with new values.
Replace each control configuration as a whole when updating it. Callbacks receive
core's `ChangeDetails` with `reason`, `event`, `cancel()` and `canceled`. Canceling
any state callback cancels the entire proposed state transaction. A data update
still publishes new rows if its reconciliation is canceled. Synchronous
controlled acknowledgements through `update` publish after the current request
callbacks finish, preserving range anchors and controlled authority.

Reasons are `keyboard`, `pointer`, `typeahead`, `programmatic` and `items-changed`.
Direct commands default to `programmatic`; pass `{ reason, event, key? }` to target
a particular row or preserve an adapter event. The `onOpen(item, details)` callback
is the app's open action. Selection defaults to single; `selectionMode: "multiple"`
enables toggling, range extension and Shift navigation. Page size defaults to 10
enabled rows. `expand` enters an already expanded row's first enabled child;
`collapse` on a collapsed row moves to its enabled parent. `toggle` only changes
expansion. Disabled and missing rows ignore pointer, selection and open actions.

Commands register in a unique per-instance scope, exposed as `tree.scope`. IDs are
`tree.next`, `tree.prev`, `tree.first`, `tree.last`, `tree.page-up`, `tree.page-down`,
`tree.parent`, `tree.expand`, `tree.collapse`, `tree.toggle`, `tree.select`,
`tree.extend-selection` and `tree.open`. Keys live entirely in `tradingPreset`,
which can be replaced or overridden through the kernel. Toggle has no default
binding. Command IDs remain available with an augmented app command registry.
Pass `scope: { target: rootElement, parent? }` when a target is already available,
or update `scope` after mounting. The root's `onFocus` also attaches its element
as the command target. Wire every returned handler through the adapter, including
focus handlers. Unmounted instances without a target participate in ambient
scope ordering until focused or disposed.

Props are plain attributes with `onKeyDown`-style handler names. Adapters map
these through their `normalizeProps`. Data flags use an empty string when active
and undefined otherwise; adapters must omit undefined attributes. Every part has
`data-slot`, state flags, depth and `style: { "--dd-depth": depth }`. Slot names
are `tree-root`, `tree-row` and `tree-toggle`; `grid` and `treegrid` modes use
`table-root`, `table-row` and `table-toggle`. Toggle props target a native button.
Render visible rows in preorder with the returned IDs. Treegrid adapters supply
their own grid cells; the core supplies root and row semantics. Listbox rows use
`option` without tree-only level/expanded attributes. `grid` rows are flat `row`s
without level, set or expansion attributes.

`focusStrategy: "active-descendant"` is the default: root tabIndex is 0 and rows
are -1. `"roving"` gives one enabled row tabIndex 0, root -1, and moves DOM focus
within a focused root when highlight changes. Empty trees keep root tabIndex 0.
Provide a stable `id` for server rendering; instance identity stays fixed after
creation. Typeahead buffers printable, unmodified characters for `typeaheadMs`
(default 500), measured using the clock port without background timers. It runs
in a microtask after keyboard dispatch so preset-consumed keys do not also search.

The tree owns its subscriptions and command scope. Dispose it before the kernel.
Disposal releases both, is idempotent, and leaves retained handlers, commands,
updates and subscriptions inert. It does not dispose shared kernel ports.
