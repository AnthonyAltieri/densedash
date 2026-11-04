import { createRoot } from "../tree/root.js";

/** The list's focusable `role="listbox"` element; pass the list from `useList`. */
export const Root = createRoot("listbox", "<List.Root>");
export type { RootProps, RootState } from "../tree/root.js";
export { Viewport } from "../tree/viewport.js";
export type { ViewportProps, ViewportState } from "../tree/viewport.js";
export { Row } from "../tree/row.js";
export type { RowProps, RowState } from "../tree/row.js";
