import type { RowData } from "@tanstack/table-core";
import {
  assignTableAPIs,
  columnFilteringFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  constructTable,
  createExpandedRowModel,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from "@tanstack/table-core";
import type {
  ExpandedState,
  RowSelectionState,
  SortingState,
  TableFeature,
  Updater,
} from "@tanstack/table-core";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";
import type { Kernel } from "../kernel.js";
import { createNavigationCommands } from "./commands.js";
import { createNavigationProps } from "./props.js";
import { createNavigationModel } from "./state.js";
import type {
  NavigableTable,
  NavigationOptions,
  NavigationFeatures,
  NavigationTable,
} from "./types.js";

export type {
  NavigableTable,
  NavigationCommands,
  NavigationFeatures,
  NavigationOptions,
  NavigationRow,
  NavigationSnapshot,
  NavigationState,
  NavigationTable,
} from "./types.js";

let nextInstance = 0;
const instances = new WeakMap<
  object,
  { controller: NavigableTable<RowData>; model: ReturnType<typeof createNavigationModel<RowData>> }
>();

/** State and APIs are opt-in through the v9 feature registry, without v8's `_features` option. */
export const navigationFeature: TableFeature = {
  getInitialState: (state) => ({ highlighted: null, anchor: null, chosenColumn: null, ...state }),
  getDefaultTableOptions: (table) => ({
    onHighlightedChange: (updater: Updater<string | null>) =>
      getNavigationRuntime(table as unknown as NavigationTable<RowData>).model.request(
        "highlighted",
        updater,
      ),
    onExpandedChange: (updater: Updater<ExpandedState>) =>
      getNavigationRuntime(table as unknown as NavigationTable<RowData>).model.request(
        "expanded",
        updater,
      ),
    onRowSelectionChange: (updater: Updater<RowSelectionState>) =>
      getNavigationRuntime(table as unknown as NavigationTable<RowData>).model.request(
        "rowSelection",
        updater,
      ),
    onSortingChange: (updater: Updater<SortingState>) =>
      getNavigationRuntime(table as unknown as NavigationTable<RowData>).model.request(
        "sorting",
        updater,
      ),
  }),
  constructTableAPIs: (table) => {
    assignTableAPIs("navigationFeature", table, {
      table_getNavigation: {
        fn: () => getNavigationRuntime(table as unknown as NavigationTable<RowData>).controller,
      },
      table_setHighlighted: {
        fn: (updater: Updater<string | null>) =>
          (
            table.options as import("./types.js").NavigationFeatureOptions<RowData>
          ).onHighlightedChange?.(updater),
      },
    });
  },
};

/** The deliberately small registry shared by Table, List and Tree, with per-table atoms. */
export const navigationFeatures = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  columnFilteringFeature,
  globalFilteringFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  filterFns: { includesString: filterFn_includesString },
  navigationFeature,
});

/** Internal: builds the controller that `table.getNavigation()` returns, once per table. */
export function getNavigationRuntime<T extends RowData>(table: NavigationTable<T>) {
  const existing = instances.get(table);
  if (existing) {
    // The WeakMap preserves the table's TData identity, which a heterogeneous map cannot express.
    return existing as unknown as {
      controller: NavigableTable<T>;
      model: ReturnType<typeof createNavigationModel<T>>;
    };
  }
  const { kernel, options } = table.options.navigation;
  const instance = nextInstance++;
  const id = options.id ?? `dd-tree-${instance}`;
  const scope = `densedash:tree:${instance}`;
  const model = createNavigationModel(kernel, table, options);
  const { commands, definitions } = createNavigationCommands(model);
  let root: HTMLElement | undefined;
  let unregister: (() => void) | undefined;
  const commandDefinitions = () =>
    table.getAllLeafColumns().some((column) => column.getCanSort())
      ? definitions
      : definitions.filter((command) => !command.id.startsWith("table."));
  function register(): void {
    unregister?.();
    unregister = undefined;
    const keys = model.options().keys;
    unregister = kernel.commands.register(scope, commandDefinitions(), {
      ...model.options().scope,
      ...(keys === undefined ? {} : { keys }),
      ...(root === undefined ? {} : { target: root }),
    });
  }
  const props = createNavigationProps({
    model,
    commands,
    clock: kernel.ports.clock,
    id,
    mount(element) {
      if (root !== element) {
        root = element;
        register();
      }
    },
  });
  const controller: NavigableTable<T> = {
    table,
    state: model.state,
    commands,
    scope,
    setHighlighted: (updater) => table.setHighlighted(updater),
    getRootProps: props.getRootProps,
    getRowProps: props.getRowProps,
    getToggleProps: props.getToggleProps,
    update(next) {
      if (!model.active()) return;
      const previous = model.options();
      model.update(next);
      if (
        model.active() &&
        ((next.scope !== undefined && next.scope !== previous.scope) ||
          ("keys" in next && JSON.stringify(next.keys) !== JSON.stringify(previous.keys)) ||
          (next.columns !== undefined && next.columns !== previous.columns))
      )
        register();
      else if (model.active() && "onOpen" in next)
        kernel.commands.update(scope, commandDefinitions());
    },
    dispose() {
      if (!model.active()) return;
      model.dispose();
      props.dispose();
      root = undefined;
      unregister?.();
      unregister = undefined;
    },
  };
  const runtime = { controller, model };
  instances.set(
    table,
    runtime as unknown as {
      controller: NavigableTable<RowData>;
      model: ReturnType<typeof createNavigationModel<RowData>>;
    },
  );
  try {
    model.change({});
    register();
  } catch (cause) {
    controller.dispose();
    throw cause;
  }
  return runtime;
}

/** Builds table-core with densedash navigation. Dispose it before its kernel. */
export function createNavigableTable<T extends RowData>(
  kernel: Kernel,
  options: NavigationOptions<T>,
): NavigableTable<T> {
  const table = constructTable<NavigationFeatures, T>({
    features: navigationFeatures,
    data: options.data,
    columns: options.columns ?? [],
    ...(options.getRowId === undefined ? {} : { getRowId: options.getRowId }),
    ...(options.getSubRows === undefined ? {} : { getSubRows: options.getSubRows }),
    navigation: { kernel, options },
    autoResetAll: false,
    enableSubRowSelection: false,
    enableMultiRowSelection: options.selectionMode === "multiple",
    enableRowSelection: (row) => !(options.isDisabled?.(row.original) ?? false),
    initialState: {
      highlighted:
        options.highlighted?.value !== undefined
          ? options.highlighted.value
          : (options.highlighted?.defaultValue ?? null),
      expanded: options.expanded?.value ?? options.expanded?.defaultValue ?? {},
      rowSelection: options.rowSelection?.value ?? options.rowSelection?.defaultValue ?? {},
      sorting: options.sorting?.value ?? options.sorting?.defaultValue ?? [],
    },
  });
  return table.getNavigation();
}
