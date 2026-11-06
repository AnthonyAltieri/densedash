import { tanstackVirtual as builtIn } from "@densedash/react";
import type { VirtualOptions, Virtualizer } from "@densedash/react";

/** @deprecated Use `VirtualOptions` from `@densedash/react`. */
export type TanstackVirtualOptions = VirtualOptions;

/**
 * @deprecated Virtualization is built into `@densedash/react`: pass `virtual` (or
 * `virtual={{ overscan, estimateSize }}`) to `Tree.Viewport`, `List.Viewport` or
 * `Table.Viewport`, or import `tanstackVirtual` from `@densedash/react` for `virtualizer={…}`.
 * This wrapper keeps the plugin's earlier default of `measure: false`.
 */
export function tanstackVirtual(options: TanstackVirtualOptions = {}): Virtualizer {
  return builtIn({ ...options, measure: options.measure ?? false });
}
