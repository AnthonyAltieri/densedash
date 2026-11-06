import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import type { ElementProps } from "../merge-props.js";
import type { NormalizedProps } from "../normalize-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import {
  EXPANDED,
  HIGHLIGHTED,
  partStyle,
  RowContext,
  rowProps,
  SELECTED,
  toggleProps,
  useRowContext,
  useRowPosition,
  useRowToken,
  useTreeContext,
} from "./context.js";
import type { TreeRow } from "./handle.js";

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

export interface RowProps<T> extends ElementAttributes<HTMLDivElement>, PartProps<RowState> {
  readonly children?: ReactNode | undefined;
  /** The row the viewport passed to its row function. */
  readonly row: TreeRow<T>;
}

/**
 * One visible row: a `treeitem` in a tree, an `option` in a list. Not generic: the row never
 * reads its item type, and inferring it costs consumers.
 */
export function Row({
  row,
  render,
  ref,
  className,
  style,
  ...props
}: RowProps<unknown>): ReactElement {
  const { handle, core } = useTreeContext("<Tree.Row>");
  const id = row.id;
  const token = useRowToken(handle.state, id);
  // Position is read apart from the token: an insertion changes every sibling's set size, which
  // re-renders this part but not the row's content.
  const position = useRowPosition(handle.state, id);
  const own: NormalizedProps =
    core === null ? { "data-slot": "tree-row" } : rowProps(core, row, token, position);
  const context = useMemo(() => ({ row, token }), [row, token]);
  const leaf = !row.getCanExpand();
  const state: RowState = {
    highlighted: (token & HIGHLIGHTED) !== 0,
    selected: (token & SELECTED) !== 0,
    expanded: !leaf && (token & EXPANDED) !== 0,
    disabled: !row.getCanSelect(),
    leaf,
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

export interface IndentProps extends ElementAttributes<HTMLSpanElement>, PartProps<IndentState> {}

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

export interface ToggleProps extends ElementAttributes<HTMLButtonElement>, PartProps<ToggleState> {
  /** Replaces the default glyph, which the stylesheet draws while the button is empty. */
  readonly children?: ReactNode | undefined;
}

/** The row's expand/collapse button: a native button that stays out of the tab order. */
export function Toggle({ render, ref, className, style, ...props }: ToggleProps): ReactElement {
  const { core, labels } = useTreeContext("<Tree.Toggle>");
  const { row, token } = useRowContext("<Tree.Toggle>");
  const own: NormalizedProps =
    core === null
      ? { "data-slot": "tree-toggle", tabIndex: -1 }
      : toggleProps(core, row, token, labels);
  const leaf = !row.getCanExpand();
  const state: ToggleState = {
    expanded: !leaf && (token & EXPANDED) !== 0,
    leaf,
    disabled: leaf || !row.getCanSelect(),
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
