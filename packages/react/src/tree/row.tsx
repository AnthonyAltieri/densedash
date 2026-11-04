import { useMemo } from "react";
import type { ComponentPropsWithRef, ReactElement } from "react";
import type { TreeRow, TreeSnapshot } from "@densedash/core";
import { mergeProps } from "../merge-props.js";
import type { ElementProps } from "../merge-props.js";
import type { NormalizedProps } from "../normalize-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import {
  HIGHLIGHTED,
  partStyle,
  RowContext,
  rowProps,
  rowToken,
  SELECTED,
  toggleProps,
  useRowContext,
  useTreeContext,
} from "./context.js";

export interface RowState {
  readonly highlighted: boolean;
  readonly selected: boolean;
  readonly expanded: boolean;
  readonly disabled: boolean;
  /** The row has no children. */
  readonly leaf: boolean;
  /** Zero-based nesting depth. */
  readonly depth: number;
}

export interface RowProps<T>
  extends Omit<ComponentPropsWithRef<"div">, "className" | "style">, PartProps<RowState> {
  /** The row the viewport passed to its row function. */
  readonly row: TreeRow<T>;
}

/** One visible row: a `treeitem` in a tree, an `option` in a list. */
export function Row<T>({
  row,
  render,
  ref,
  className,
  style,
  ...props
}: RowProps<T>): ReactElement {
  const { handle, core } = useTreeContext("<Tree.Row>");
  const key = row.key;
  const select = useMemo(() => (state: TreeSnapshot<unknown>) => rowToken(state, key), [key]);
  const token = useStore(handle.state, select);
  const own: NormalizedProps =
    core === null ? { "data-slot": "tree-row" } : rowProps(core, row, token);
  const context = useMemo(() => ({ row, token }), [row, token]);
  const state: RowState = {
    highlighted: (token & HIGHLIGHTED) !== 0,
    selected: (token & SELECTED) !== 0,
    expanded: row.expanded,
    disabled: row.disabled,
    leaf: !row.hasChildren,
    depth: row.depth,
  };
  const rendered = useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(own as ElementProps, props),
      className,
      style: partStyle(own.style, style),
    },
  });
  return <RowContext value={context}>{rendered}</RowContext>;
}

export interface IndentState {
  readonly depth: number;
}

export interface IndentProps
  extends
    Omit<ComponentPropsWithRef<"span">, "className" | "style" | "children">,
    PartProps<IndentState> {}

/** Leading space of `--dd-depth` × `--dd-indent`, hidden from assistive technology. */
export function Indent({ render, ref, className, style, ...props }: IndentProps): ReactElement {
  const { row } = useRowContext("<Tree.Indent>");
  const own = { "--dd-depth": row.depth } as NormalizedProps["style"];
  const state: IndentState = { depth: row.depth };
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "span",
    props: {
      ...mergeProps<"span">({ "data-slot": "tree-indent", "aria-hidden": true }, props),
      className,
      style: partStyle(own, style),
    },
  });
}

export interface ToggleState {
  readonly expanded: boolean;
  readonly leaf: boolean;
  readonly disabled: boolean;
}

export interface ToggleProps
  extends Omit<ComponentPropsWithRef<"button">, "className" | "style">, PartProps<ToggleState> {}

/** The row's expand/collapse button: a native button that stays out of the tab order. */
export function Toggle({ render, ref, className, style, ...props }: ToggleProps): ReactElement {
  const { core } = useTreeContext("<Tree.Toggle>");
  const { row, token } = useRowContext("<Tree.Toggle>");
  const own: NormalizedProps =
    core === null ? { "data-slot": "tree-toggle", tabIndex: -1 } : toggleProps(core, row, token);
  const state: ToggleState = {
    expanded: row.expanded,
    leaf: !row.hasChildren,
    disabled: row.disabled || !row.hasChildren,
  };
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "button",
    props: {
      ...mergeProps<"button">(own as ElementProps<"button">, { type: "button" }, props),
      className,
      style: partStyle(own.style, style),
    },
  });
}
