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
