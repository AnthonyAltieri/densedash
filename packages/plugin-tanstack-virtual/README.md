# @densedash/plugin-tanstack-virtual

**Deprecated.** Virtualization is built into `@densedash/react`. Pass `virtual` to a viewport
and remove this package:

```tsx
import { Tree, useTree } from "@densedash/react";

function Book({ holdings }) {
  const tree = useTree({ data: holdings, getRowId: (holding) => holding.id });
  return (
    <Tree.Root tree={tree}>
      <Tree.Viewport tree={tree} virtual style={{ blockSize: 384 }}>
        {(row) => <Tree.Row row={row}>{row.original.name}</Tree.Row>}
      </Tree.Viewport>
    </Tree.Root>
  );
}
```

`virtual` works the same on `List.Viewport` and `Table.Viewport`. It estimates rows at the
viewport's `--dd-row-height`, so the estimate follows the density setting, and measures rows
as they render. Tune it with `virtual={{ overscan, estimateSize, measure }}`. For a custom
strategy, pass a `Virtualizer` through `virtualizer={…}`; `tanstackVirtual` is exported from
`@densedash/react` for that.

This final release re-exports `tanstackVirtual` from `@densedash/react` as a thin wrapper
that keeps this package's earlier default of `measure: false`, and `TanstackVirtualOptions`
as an alias of `VirtualOptions` (`estimateSize` is now optional). It no longer depends on
`@tanstack/virtual-core` or `@densedash/core`.

## `measure`

`measure` decides whether mounted rows are measured. With `measure: true`, each row is
measured with TanStack's `measureElement` as it renders, and later size changes are
followed, so rows of different heights (two-line rows, expanded detail) get their real
offsets. With `measure: false`, every row keeps its estimated height (`estimateSize`, or
the viewport's `--dd-row-height`); use it when all rows have that height.

The defaults differ: this package's `tanstackVirtual()` defaults to `measure: false`, as it
always did, while the built-in `virtual` prop and `tanstackVirtual` from `@densedash/react`
default to `measure: true`. To keep fixed-height rows after migrating, pass
`virtual={{ measure: false }}`:

```tsx
// Before: the plugin's strategy, fixed-height rows.
const [virtualizer] = useState(() => tanstackVirtual({ estimateSize: () => 28 }));
<Tree.Viewport tree={tree} virtualizer={virtualizer} style={{ blockSize: 384 }}>
  {(row) => <Tree.Row row={row}>{row.original.name}</Tree.Row>}
</Tree.Viewport>;

// After: the built-in prop, still fixed-height rows.
<Tree.Viewport tree={tree} virtual={{ measure: false }} style={{ blockSize: 384 }}>
  {(row) => <Tree.Row row={row}>{row.original.name}</Tree.Row>}
</Tree.Viewport>;
```

Without `estimateSize`, the estimate is the viewport's `--dd-row-height`, so set that
variable (or keep `estimateSize`) to match the rendered row height.
