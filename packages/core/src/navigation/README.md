# Navigation on TanStack Table

`createNavigableTable(kernel, options)` creates a framework-neutral controller and a
TanStack Table 9.3.1 instance at `controller.table`. Render its final
`table.getRowModel().rows`; the expanded row model inserts visible descendants into
that array. `data`, `getRowId` and `getSubRows` are TanStack's source of row identity
and nesting. Supply stable IDs when data changes.

```ts
import { createKernel, createNavigableTable } from "@densedash/core";

const kernel = createKernel();
const navigation = createNavigableTable(kernel, {
  data: [{ id: "cash", label: "Cash", balance: 12 }],
  getRowId: (item) => item.id,
  getTextValue: (item) => item.label,
  mode: "grid",
  columns: [{ id: "balance", accessorKey: "balance" }],
  onOpen: (item) => console.log(item.balance),
});
navigation.commands.first();
navigation.commands.select();
console.log(navigation.state.get(), navigation.getRowProps("cash"));
navigation.update({ data: [{ id: "cash", label: "Cash", balance: 20 }] });
navigation.dispose();
kernel.dispose();
```

`navigationFeature` is a v9 custom feature. It contributes cursor, range anchor
and chosen-column state through `TableState_FeatureMap`; options and table APIs
use their corresponding feature maps. Its hooks are `getInitialState`,
`getDefaultTableOptions` and `constructTableAPIs`, using `assignTableAPIs`.
`navigationFeatures` is the reusable `tableFeatures(...)` registry with sorting,
filtering, expansion, selection and column visibility/order/size, plus the client
row-model factories and vanilla Store reactivity. It uses the v9 `features`
option. It does not use v8's `_features` construction option.

For direct `constructTable`, pass `features: navigationFeatures` and
`navigation: { kernel, options }`, along with data, columns and the row accessors.
`table.getNavigation()` lazily constructs the controller once; its owner must
call `dispose()`. Prefer the factory to initialize all control defaults and turn
off automatic state resets. Register the navigation feature after its built-in
features when composing a registry yourself.

TanStack atoms own expanded (`true | Record<string, boolean>`), rowSelection
(`Record<string, true>`), sorting and column state. densedash owns `highlighted`
(`string | null`), the selection anchor, chosen sort column, commands, typeahead,
page size, loop, focus strategy and ARIA. The controller's read-only `state` store
publishes all those TanStack slices plus cursor state. It publishes data changes
as well. The table and controller share state; there is no second tree engine.

`highlighted`, `expanded`, `rowSelection` and `sorting` accept
`{ value?, defaultValue?, onChange? }`. Defaults apply at creation. A supplied
`value` remains authoritative until `update` acknowledges a change; an observed
uncontrolled slice updates internally. Callbacks receive `ChangeDetails` with
`reason`, `event`, `cancel()` and `canceled`. Cancellation rejects the whole
command transaction. Data updates still publish their rows. Synchronous owner
acknowledgements queue until all callbacks finish. Replace control configurations
as a whole, and do not give the same slice a second owner through raw table
`state`, `atoms` or updater callbacks.

Commands retain all `tree.*` IDs and `table.sort` / `table.next-column`, registered
in one scope per controller. The methods are also available under `commands`.
Commands read the current visible TanStack model, skip disabled rows, and apply
one transaction. Expand on a leaf or an expanded row does nothing. Collapse on a
collapsed row moves to its enabled parent. Range selection uses visible rows,
skipping disabled ones. Sorting and expansion call TanStack APIs. The existing
swappable trading preset owns every key choice. Update `scope.target` when the
root mounts, or forward the root's `onFocus` handler to attach it automatically.

Prop getters retain `data-slot`, state flags, `--dd-depth` and ARIA shapes.
Modes are `tree` (default), `listbox`, `treegrid` and `grid`. Focus defaults to
`active-descendant`; `roving` gives one enabled row the tab stop and moves focus
inside a focused root. Wire every returned event handler through the adapter.
Typeahead reads only the kernel clock port, buffers for `typeaheadMs` (default
500), and searches in a microtask after keyboard dispatch, so consumed shortcut
keys do not also search. There are no navigation timers.

After data changes, a live cursor stays on its ID. A removed/disabled cursor
moves to the nearest surviving enabled row in the old order, with the following
row winning ties. Selection and range anchor are pruned to visible rows;
expansion is retained for hidden descendants. Duplicate IDs anywhere in the
core model, including collapsed descendants, throw an error naming the ID.
Invalid updates leave the last accepted data and state intact.

`createTree` and the exported collection snapshot types are deprecated bridges
for DD-30/DD-31. No React source files change in this migration. Those tickets
must migrate tree/list handles, context, root, row and viewport to this controller
and TanStack rows; migrate table columns, handles, root and headers to TanStack
column/sort state; and remove React's pre-sorting, duplicate sort scopes, set-based
controls and the compatibility exports. Virtualization remains DD-32.
