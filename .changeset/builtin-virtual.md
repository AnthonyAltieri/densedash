---
"@densedash/react": minor
---

Built-in virtualization: `<Tree.Viewport virtual>`, `<List.Viewport virtual>` and `<Table.Viewport virtual>` mount only the rows in view with TanStack Virtual, with no setup. Rows are estimated at the viewport's computed `--dd-row-height`, read again when a `data-dd-density` attribute changes or the viewport resizes, so the estimate follows the density setting, and they are measured as they render. `virtual={{ overscan, estimateSize, measure }}` tunes it. `tanstackVirtual` and `VirtualOptions` are exported for passing the same strategy through `virtualizer={…}`, which still takes any custom `Virtualizer`; passing both `virtual` and `virtualizer` throws. `@tanstack/virtual-core` 3.19.11 is now a dependency.
