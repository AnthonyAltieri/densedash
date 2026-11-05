import { useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createNavigableTable } from "@densedash/core";
import type { NavigableTable, RowData, TreeMode } from "@densedash/core";
import { useKernelFor } from "../context.js";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import type { ElementProps } from "../merge-props.js";
import { ScopeContext } from "../scope-context.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import { partStyle, rootProps, TreeContext } from "./context.js";
import { getInternals } from "./handle.js";
import type { TreeHandleBase } from "./handle.js";

export interface RootState {
  /** The tree has no visible rows. */
  readonly empty: boolean;
}

export interface RootProps<T> extends ElementAttributes<HTMLDivElement>, PartProps<RootState> {
  readonly children?: ReactNode | undefined;
  /** The tree from `useTree` (or `useList`). */
  readonly tree: TreeHandleBase<T>;
}

/**
 * Shared by `Tree.Root` and `List.Root`. The root owns the TanStack table and its navigation:
 * it creates them once its element mounts (so commands bind to that element inside the
 * nearest `<Keymap.Scope>`) and disposes them on unmount. Data errors from `useTree` updates
 * are rethrown here, during render, so the nearest error boundary around the root handles them.
 *
 * Rows render after mount. Creating the navigation registers its commands with the kernel,
 * which a render must not do (React may discard or repeat it), so server rendering and the
 * first client render emit the root, with its stable id from `useTree`, and an empty viewport.
 */
export function createRoot(mode: TreeMode, part: string) {
  // Not generic: the root never reads the item type, and inferring it costs consumers.
  return function Root({
    tree,
    render,
    ref,
    className,
    style,
    ...props
  }: RootProps<unknown>): ReactElement {
    const kernel = useKernelFor(part);
    const internals = getInternals(tree);
    const parent = useContext(ScopeContext)?.name;
    const [element, setElement] = useState<HTMLElement | null>(null);
    const [core, setCore] = useState<NavigableTable<RowData> | null>(null);
    const failure = useStore(internals.failure);
    const snapshot = useStore(tree.state);
    if (failure !== null) throw failure.cause;

    useLayoutEffect(() => {
      if (element === null) return;
      const created = createNavigableTable(kernel, {
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

    // Label updates reach the core in a layout effect, which publishes a snapshot and renders
    // this root again; the new context then re-renders the toggles.
    const { expand = "", collapse = "" } = internals.options().labels ?? {};
    const labels = `${expand}\n${collapse}`;
    const context = useMemo(() => ({ handle: tree, core, labels }), [tree, core, labels]);
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
