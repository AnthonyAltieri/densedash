import { createRoot } from "./root.js";

/** The tree's focusable `role="tree"` element; pass the tree from `useTree`. */
export const Root = createRoot("tree", "<Tree.Root>");
export type { RootProps, RootState } from "./root.js";
export { Viewport } from "./viewport.js";
export type { ViewportProps, ViewportState } from "./viewport.js";
export { Indent, Row, Toggle } from "./row.js";
export type {
  IndentProps,
  IndentState,
  RowProps,
  RowState,
  ToggleProps,
  ToggleState,
} from "./row.js";
