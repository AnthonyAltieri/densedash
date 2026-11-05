import type { RowData } from "@densedash/core";
import { useTree } from "../tree/handle.js";
import type { TreeHandle, UseTreeOptions } from "../tree/handle.js";

/** Options for `useList`: a tree's. `getSubRows` makes a nested (two-level) list. */
export interface UseListOptions<T> extends UseTreeOptions<T> {}

/**
 * Creates a list for `<List.Root>` and `<List.Viewport>`: one implicit column over `data`, and
 * nested when `getSubRows` is given. `row.original` is inferred from `data`.
 */
export function useList<T extends RowData>(options: UseListOptions<T>): TreeHandle<T> {
  return useTree(options);
}
