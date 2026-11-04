import { useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ComponentPropsWithRef, ReactElement } from "react";
import { createTree } from "@densedash/core";
import type { Tree as CoreTree, TreeMode } from "@densedash/core";
import { useKernelFor } from "../context.js";
import { mergeProps } from "../merge-props.js";
import type { ElementProps } from "../merge-props.js";
import { ScopeContext } from "../scope-context.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import { partStyle, rootProps, TreeContext } from "./context.js";
import { getInternals } from "./handle.js";
import type { TreeHandle } from "./handle.js";

export interface RootState {
  /** The tree has no visible rows. */
  readonly empty: boolean;
}

export interface RootProps<T>
  extends Omit<ComponentPropsWithRef<"div">, "className" | "style">, PartProps<RootState> {
  /** The tree from `useTree` (or `useList`). */
  readonly tree: TreeHandle<T>;
}

/**
 * Shared by `Tree.Root` and `List.Root`. The root owns the core tree: it creates it once its
 * element mounts (so commands bind to that element inside the nearest `<Keymap.Scope>`) and
 * disposes it on unmount. Data errors from `useTree` updates are rethrown here, during render,
 * so the nearest error boundary around the root handles them.
 */
export function createRoot(mode: TreeMode, part: string) {
  return function Root<T>({
    tree,
    render,
    ref,
    className,
    style,
    ...props
  }: RootProps<T>): ReactElement {
    const kernel = useKernelFor(part);
    const internals = getInternals(tree);
    const parent = useContext(ScopeContext)?.name;
    const [element, setElement] = useState<HTMLElement | null>(null);
    const [core, setCore] = useState<CoreTree<T> | null>(null);
    const failure = useStore(internals.failure);
    const snapshot = useStore(tree.state);
    if (failure !== null) throw failure.cause;

    useLayoutEffect(() => {
      if (element === null) return;
      const created = createTree(kernel, {
        ...internals.options(),
        mode,
        scope: { target: element, ...(parent === undefined ? {} : { parent }) },
      });
      const detach = internals.attach(created);
      setCore(created);
      return () => {
        detach();
        created.dispose();
        setCore(null);
      };
    }, [kernel, internals, element, parent]);

    const context = useMemo(() => ({ handle: tree, core }), [tree, core]);
    const own =
      core === null
        ? { "data-slot": "tree-root", id: internals.options().id, role: mode, tabIndex: 0 }
        : rootProps(core, snapshot);
    const state: RootState = { empty: snapshot.rows.length === 0 };
    const rendered = useRender({
      render,
      ref: [ref, setElement],
      state,
      props: {
        ...mergeProps(own as ElementProps, props),
        className,
        style: partStyle(own.style, style),
      },
    });
    return <TreeContext value={context}>{rendered}</TreeContext>;
  };
}
