import type { Key, TreeRow, TreeState } from "../collections/types.js";

export type TreeChangeReason =
  | "keyboard"
  | "pointer"
  | "typeahead"
  | "programmatic"
  | "items-changed";
export type TreeMode = "tree" | "listbox" | "treegrid" | "grid";
export type TreeFocusStrategy = "active-descendant" | "roving";

/** Accessible names of a row's expand/collapse toggle, for localization. */
export interface TreeLabels {
  /** Names a collapsed row's toggle. Defaults to "Expand". */
  readonly expand?: string;
  /** Names an expanded row's toggle. Defaults to "Collapse". */
  readonly collapse?: string;
}

export interface TreeAction {
  /** Defaults to the highlighted row. */
  key?: Key;
  reason?: TreeChangeReason;
  event?: Event;
}

export interface TreeCommands {
  next(action?: TreeAction): void;
  prev(action?: TreeAction): void;
  first(action?: TreeAction): void;
  last(action?: TreeAction): void;
  page(direction: 1 | -1, action?: TreeAction): void;
  parent(action?: TreeAction): void;
  expand(action?: TreeAction): void;
  collapse(action?: TreeAction): void;
  toggle(action?: TreeAction): void;
  select(action?: TreeAction): void;
  extendSelection(action?: TreeAction): void;
  open(action?: TreeAction): void;
}

/** The navigation model's internal projection of TanStack's visible rows. */
export interface TreeSnapshot<out T> extends Readonly<TreeState> {
  readonly rows: readonly TreeRow<T>[];
}

export interface TreePartProps {
  /** Grid and treegrid modes use the `table-*` slots. */
  "data-slot":
    | "tree-root"
    | "tree-row"
    | "tree-toggle"
    | "table-root"
    | "table-row"
    | "table-toggle";
  "data-highlighted": "" | undefined;
  "data-selected": "" | undefined;
  "data-expanded": "" | undefined;
  "data-depth": number;
  "data-disabled": "" | undefined;
  "data-leaf": "" | undefined;
  style: { "--dd-depth": number };
}

export interface TreeRootProps extends TreePartProps {
  id: string;
  role: TreeMode;
  tabIndex: number;
  "aria-activedescendant": string | undefined;
  "aria-multiselectable": boolean;
  onKeyDown(event: KeyboardEvent): void;
  onFocus(event: FocusEvent): void;
}

export interface TreeRowProps extends TreePartProps {
  id: string;
  role: "treeitem" | "option" | "row";
  tabIndex: number;
  "aria-level": number | undefined;
  "aria-posinset": number | undefined;
  "aria-setsize": number | undefined;
  "aria-rowindex": number | undefined;
  "aria-expanded": boolean | undefined;
  "aria-selected": boolean;
  "aria-disabled": boolean;
  onPointerMove(event: PointerEvent): void;
  onClick(event: MouseEvent): void;
  onDoubleClick(event: MouseEvent): void;
  onFocus(event: FocusEvent): void;
}

export interface TreeToggleProps extends TreePartProps {
  type: "button";
  tabIndex: -1;
  disabled: boolean;
  "aria-label": string;
  "aria-expanded": boolean | undefined;
  onClick(event: MouseEvent): void;
}
