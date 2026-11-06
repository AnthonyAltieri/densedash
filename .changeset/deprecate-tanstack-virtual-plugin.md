---
"@densedash/plugin-tanstack-virtual": patch
---

Deprecated: virtualization is built into `@densedash/react`. Pass `virtual` to a viewport instead. This final release re-exports `tanstackVirtual` from `@densedash/react` as a thin wrapper that keeps the earlier `measure: false` default, and `TanstackVirtualOptions` as an alias of `VirtualOptions`; `estimateSize` is now optional and defaults to the viewport's `--dd-row-height`. It no longer depends on `@tanstack/virtual-core` or `@densedash/core`.
