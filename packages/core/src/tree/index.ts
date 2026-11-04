import type { Kernel } from "../kernel.js";
import { createTreeCommands } from "./commands.js";
import { createTreeProps } from "./props.js";
import { createTreeState } from "./state.js";
import type { Tree, TreeOptions } from "./types.js";

export type {
  Tree,
  TreeAction,
  TreeChangeReason,
  TreeCommands,
  TreeFocusStrategy,
  TreeMode,
  TreeOptions,
  TreePartProps,
  TreeRootProps,
  TreeRowProps,
  TreeSnapshot,
  TreeToggleProps,
} from "./types.js";

let nextTree = 0;

/** Framework-neutral tree, listbox or treegrid. Dispose the tree before its kernel. */
export function createTree<T>(kernel: Kernel, options: TreeOptions<T>): Tree<T> {
  const instance = nextTree++;
  const id = options.id ?? `dd-tree-${instance}`;
  const scope = `densedash:tree:${instance}`;
  const model = createTreeState(kernel.ports.store, options);
  const { commands, definitions } = createTreeCommands(model);
  let root: HTMLElement | undefined;
  let unregister: (() => void) | undefined;

  function register(): void {
    unregister?.();
    unregister = undefined;
    unregister = kernel.commands.register(scope, definitions, {
      ...model.options().scope,
      ...(root === undefined ? {} : { target: root }),
    });
  }

  const props = createTreeProps({
    model,
    commands,
    clock: kernel.ports.clock,
    id,
    mount(element) {
      if (root === element) return;
      root = element;
      register();
    },
  });
  try {
    register();
  } catch (cause) {
    model.dispose();
    props.dispose();
    throw cause;
  }

  return {
    get rows() {
      return model.get().rows;
    },
    state: { get: model.get, subscribe: model.subscribe },
    commands,
    scope,
    getRootProps: props.getRootProps,
    getRowProps: props.getRowProps,
    getToggleProps: props.getToggleProps,
    update(next) {
      if (!model.active()) return;
      model.update(next);
      if (model.active() && next.scope !== undefined) register();
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
}
