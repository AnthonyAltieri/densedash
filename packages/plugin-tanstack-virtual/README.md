# @densedash/plugin-tanstack-virtual

A per-instance vertical viewport strategy built on `@tanstack/virtual-core` 3.19.11.
It works with `Tree.Viewport` and `List.Viewport`. It does not register a kernel plugin.

Install the peers `@densedash/core`, `@densedash/react`, and exactly
`@tanstack/virtual-core@3.19.11`. The React import is type-only; the plugin's JavaScript
imports only TanStack core. React remains a peer because the public declaration returns
its `Virtualizer` contract.

```tsx
import { useState } from "react";
import type { CSSProperties } from "react";
import { Tree, useTree } from "@densedash/react";
import { tanstackVirtual } from "@densedash/plugin-tanstack-virtual";

function Book({ holdings }) {
  const tree = useTree({ data: holdings, getRowId: (holding) => holding.id });
  const [virtualizer] = useState(() => tanstackVirtual({ estimateSize: () => 28 }));
  const rowStyle = { "--dd-row-height": "28px" } as CSSProperties;
  return (
    <Tree.Root tree={tree} style={rowStyle}>
      <Tree.Viewport tree={tree} virtualizer={virtualizer} style={{ blockSize: 384 }}>
        {(row) => <Tree.Row row={row}>{row.original.name}</Tree.Row>}
      </Tree.Viewport>
    </Tree.Root>
  );
}
```

Use `useList`, `List.Root`, `List.Viewport`, and `List.Row` for a flat list.
Create one strategy per viewport and keep its identity stable. The scroll element needs
a constrained height. `estimateSize(index)` must match each rendered row's height,
including spacing. This strategy uses estimates and does not attach row measurement refs.
`overscan` defaults to eight rows on either side.

The viewport calls `sync({ element, count })` before following the cursor, reads `range()`
with an exclusive end, and uses `padding()` for the two spacers. `scrollToIndex(index,
"auto" | "center")` delegates to TanStack with instant scrolling. `offsetForIndex(index)`
lets the viewport preserve a data anchor even when prepends move it outside the mounted
range. Resizes reveal the last requested cursor row. Focus stays on the root while rows
mount and unmount.

The viewport's `subscribe` lifetime owns the observers. The last unsubscribe runs
TanStack's adapter cleanup and drops the scroll element reference. A strategy can be
subscribed again after cleanup, including React StrictMode's effect replay. No hook,
global listener, or kernel disposal step is required.

Run the tree example with `pnpm --filter @densedash/example-react-tree dev`, choose
**Virtualized**, then **50,000** rows. The default **All rows** mode remains available.
