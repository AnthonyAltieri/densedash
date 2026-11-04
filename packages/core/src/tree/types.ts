import type { Key, TreeRow, TreeSource, TreeState } from "../collections/types.js";
import type { ChangeDetails, Controllable } from "../controllable.js";
import type { CommandScopeOptions } from "../commands/types.js";
import type { Store } from "../ports/store.js";

export type TreeChangeReason =
  | "keyboard"
  | "pointer"
  | "typeahead"
  | "programmatic"
  | "items-changed";
export type TreeMode = "tree" | "listbox" | "treegrid";
export type TreeFocusStrategy = "active-descendant" | "roving";

export interface TreeOptions<T> extends TreeSource<T> {
  /** Supply a stable id for server rendering. Otherwise generated per instance. */
  id?: string;
  mode?: TreeMode;
  focusStrategy?: TreeFocusStrategy;
  selectionMode?: "single" | "multiple";
  highlighted?: Controllable<Key | null, TreeChangeReason>;
  selected?: Controllable<ReadonlySet<Key>, TreeChangeReason>;
  expanded?: Controllable<ReadonlySet<Key>, TreeChangeReason>;
  loop?: boolean;
  /** Number of enabled rows per page. Defaults to 10. */
  pageSize?: number;
  /** Milliseconds between typed characters. Defaults to 500. */
  typeaheadMs?: number;
  /** Scope options, including the mounted root target for keyboard isolation. */
  scope?: CommandScopeOptions;
  onOpen?(item: NoInfer<T>, details: ChangeDetails<TreeChangeReason>): void;
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

export interface TreeSnapshot<T> extends Readonly<TreeState> {
  readonly rows: readonly TreeRow<T>[];
}

export interface TreePartProps {
  "data-slot": "tree-root" | "tree-row" | "tree-toggle";
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

export interface Tree<T> {
  readonly rows: readonly TreeRow<T>[];
  readonly state: Pick<Store<TreeSnapshot<T>>, "get" | "subscribe">;
  readonly commands: TreeCommands;
  readonly scope: string;
  /** Merge live data, control values and presentation options. Defaults apply only at creation. */
  update(options: Partial<TreeOptions<T>>): void;
  getRootProps(): TreeRootProps;
  getRowProps(key: Key): TreeRowProps;
  getToggleProps(key: Key): TreeToggleProps;
  dispose(): void;
}
