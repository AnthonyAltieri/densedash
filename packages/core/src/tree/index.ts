import type { RowData } from "@tanstack/table-core";
import type { Controllable } from "../controllable.js";
import type { Kernel } from "../kernel.js";
import { createNavigableTable, getNavigationRuntime } from "../navigation/index.js";
import { keyState } from "../navigation/state.js";
import type { NavigationOptions } from "../navigation/types.js";
import type { Tree, TreeChangeReason, TreeOptions, TreeSnapshot } from "./types.js";

export type {
  Tree,
  TreeAction,
  ListBaseOptions,
  TreeBaseOptions,
  TreeChangeReason,
  TreeCommands,
  TreeFocusStrategy,
  TreeLabels,
  TreeMode,
  TreeOptions,
  TreePartProps,
  TreeRootProps,
  TreeRowProps,
  TreeSnapshot,
  TreeToggleProps,
} from "./types.js";

function control<T>(
  source: Controllable<ReadonlySet<string>, TreeChangeReason> | undefined,
  encode: (keys: ReadonlySet<string>) => T,
  decode: (value: T) => ReadonlySet<string>,
): Controllable<T, TreeChangeReason> {
  return {
    ...(source?.value === undefined ? {} : { value: encode(source.value) }),
    ...(source?.defaultValue === undefined ? {} : { defaultValue: encode(source.defaultValue) }),
    onChange: (value, details) => source?.onChange?.(decode(value), details),
  };
}

/** @deprecated DD-30/DD-31: use createNavigableTable with data/getRowId/getSubRows and TanStack state. */
export function createTree<T>(kernel: Kernel, initial: TreeOptions<T>): Tree<T> {
  let options = initial;
  const mapped = () => ({
    ...options,
    data: options.roots,
    getRowId: (item: T) => options.getKey(item),
    getSubRows: (item: T) => options.getChildren?.(item),
    expanded: control(
      options.expanded,
      keyState,
      (value) => new Set(Object.keys(value).filter((key) => value[key])),
    ),
    rowSelection: control(
      options.selected,
      keyState,
      (value) => new Set(Object.keys(value).filter((key) => value[key])),
    ),
  });
  // TanStack constrains its public data type to objects. This legacy adapter treats data
  // as opaque and preserves item identity, including legacy primitive list values.
  const navigation = createNavigableTable(
    kernel,
    mapped() as unknown as NavigationOptions<RowData>,
  );
  const { model } = getNavigationRuntime(navigation.table);
  return {
    get rows() {
      return (model.get() as TreeSnapshot<T>).rows;
    },
    state: {
      get: () => model.get() as TreeSnapshot<T>,
      subscribe: (listener) => model.subscribe((snapshot) => listener(snapshot as TreeSnapshot<T>)),
    },
    commands: navigation.commands,
    scope: navigation.scope,
    getRootProps: navigation.getRootProps,
    getRowProps: navigation.getRowProps,
    getToggleProps: navigation.getToggleProps,
    dispose: navigation.dispose,
    update(next) {
      if (!model.active()) return;
      const previous = options;
      options = { ...options, ...next };
      try {
        navigation.update(mapped() as unknown as NavigationOptions<RowData>);
      } catch (cause) {
        options = previous;
        throw cause;
      }
    },
  };
}
