import { createRoot } from "../tree/root.js";

/** The list's focusable `role="listbox"` element; pass the list from `useList`. */
export const Root = createRoot("listbox", "<List.Root>");
export type { RootProps, RootState } from "../tree/root.js";
export { Viewport } from "../tree/viewport.js";
export type { ViewportProps, ViewportState } from "../tree/viewport.js";
export { Indent, Row, Toggle } from "../tree/row.js";
export type {
  IndentProps,
  IndentState,
  RowProps,
  RowState,
  ToggleProps,
  ToggleState,
} from "../tree/row.js";
