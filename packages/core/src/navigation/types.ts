import type { RowData } from "@tanstack/table-core";
import type {
  ColumnDef,
  ExpandedState,
  RowSelectionState,
  SortingState,
  Table,
  TableFeatures,
  TableState_ColumnFiltering,
  TableState_ColumnOrdering,
  TableState_ColumnSizing,
  TableState_ColumnVisibility,
  TableState_GlobalFiltering,
  Updater,
} from "@tanstack/table-core";
import type { ChangeDetails, Controllable } from "../controllable.js";
import type { CommandScopeOptions } from "../commands/types.js";
import type { Kernel } from "../kernel.js";
import type { Store } from "../ports/store.js";
import type {
  TreeAction,
  TreeChangeReason,
  TreeCommands,
  TreeFocusStrategy,
  TreeLabels,
  TreeMode,
  TreeRootProps,
  TreeRowProps,
  TreeToggleProps,
} from "../tree/types.js";
import type { navigationFeatures } from "./index.js";

export interface NavigationState {
  highlighted: string | null;
  anchor: string | null;
  chosenColumn: string | null;
}

export interface NavigationSnapshot
  extends
    NavigationState,
    TableState_ColumnFiltering,
    TableState_GlobalFiltering,
    TableState_ColumnOrdering,
    TableState_ColumnSizing,
    TableState_ColumnVisibility {
  expanded: ExpandedState;
  rowSelection: RowSelectionState;
  sorting: SortingState;
}

export interface NavigationOptions<T extends RowData> {
  data: readonly T[];
  getRowId?(item: NoInfer<T>, index: number, parent?: NavigationRow<T>): string;
  getSubRows?(item: NoInfer<T>, index: number): readonly NoInfer<T>[] | undefined;
  columns?: readonly ColumnDef<NavigationFeatures, NoInfer<T>>[];
  isDisabled?(item: NoInfer<T>): boolean;
  getTextValue?(item: NoInfer<T>): string;
  id?: string;
  mode?: TreeMode;
  focusStrategy?: TreeFocusStrategy;
  selectionMode?: "single" | "multiple";
  highlighted?: Controllable<string | null, TreeChangeReason>;
  expanded?: Controllable<ExpandedState, TreeChangeReason>;
  rowSelection?: Controllable<RowSelectionState, TreeChangeReason>;
  sorting?: Controllable<SortingState, TreeChangeReason>;
  loop?: boolean;
  pageSize?: number;
  typeaheadMs?: number;
  labels?: TreeLabels;
  scope?: CommandScopeOptions;
  onOpen?(item: NoInfer<T>, details: ChangeDetails<TreeChangeReason>): void;
}

export interface NavigationCommands extends TreeCommands {
  sort(column?: string, action?: TreeAction): void;
  chooseColumn(direction?: 1 | -1, action?: TreeAction): void;
}

export type NavigationFeatures = typeof navigationFeatures;
export type NavigationRow<T extends RowData> = ReturnType<Table<NavigationFeatures, T>["getRow"]>;
export type NavigationTable<T extends RowData> = Table<NavigationFeatures, T>;

export interface NavigableTable<T extends RowData> {
  readonly table: NavigationTable<T>;
  readonly state: Pick<Store<NavigationSnapshot>, "get" | "subscribe">;
  readonly commands: NavigationCommands;
  readonly scope: string;
  setHighlighted(updater: Updater<string | null>): void;
  getRootProps(): TreeRootProps;
  getRowProps(id: string): TreeRowProps;
  getToggleProps(id: string): TreeToggleProps;
  update(options: Partial<NavigationOptions<T>>): void;
  dispose(): void;
}

export interface NavigationFeatureOptions<T extends RowData> {
  navigation: { kernel: Kernel; options: NavigationOptions<T> };
  onHighlightedChange?: (updater: Updater<string | null>) => void;
}

export interface NavigationTableAPI<T extends RowData> {
  getNavigation(): NavigableTable<T>;
  setHighlighted(updater: Updater<string | null>): void;
}

declare module "@tanstack/table-core" {
  interface Plugins {
    navigationFeature: import("@tanstack/table-core").TableFeature;
  }
  interface TableState_FeatureMap {
    navigationFeature: NavigationState;
  }
  interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
    navigationFeature: NavigationFeatureOptions<TData>;
  }
  interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
    navigationFeature: NavigationTableAPI<TData>;
  }
}
