import { useTree } from "../tree/handle.js";
import type { TreeHandle, UseTreeOptions } from "../tree/handle.js";

/** Options for `useList`: a tree's options without nesting. */
export interface UseListOptions<T> extends Omit<UseTreeOptions<T>, "getChildren" | "expanded"> {}

/** Creates a flat list for `<List.Root>` and `<List.Viewport>`; `row.item` is inferred from `roots`. */
export function useList<T>(options: UseListOptions<T>): TreeHandle<T> {
  return useTree(options);
}
