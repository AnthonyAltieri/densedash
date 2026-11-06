import { useLayoutEffect, useRef } from "react";
import type { PointerEvent, ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { Root as ListRoot } from "../list/index.js";
import type { DensedashEvent } from "../merge-props.js";
import { mergeProps } from "../merge-props.js";
import { Root as TreeRoot } from "../tree/index.js";
import type { TreeHandleBase, TreeRow } from "../tree/handle.js";
import { Indent, Row, Toggle } from "../tree/row.js";
import { Viewport } from "../tree/viewport.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import type { VirtualOptions } from "../virtual/tanstack-virtual.js";
import { LayerKeys } from "./shell.js";

// The pane headers show the keys of these commands from the tree's key layer.
const moves = ["tree.next", "tree.prev"] as const;

// A hovered row stays where it is: in a shell the cursor drives the next pane, so only keys,
// clicks and the app move it. Skipping the row's own handler keeps hover from highlighting.
function keepCursor(event: DensedashEvent<PointerEvent<HTMLDivElement>>): void {
  event.preventDensedashHandler();
}

export interface PaneState {}

interface PaneProps<T> extends ElementAttributes<HTMLElement>, PartProps<PaneState> {
  /**
   * Renders a row's content after its indent and toggle, such as an `<AppShell.Label>` and an
   * `<AppShell.Count>`. `row.original` is the item.
   */
  readonly children: (row: TreeRow<T>) => ReactNode;
  /** The tree's or list's accessible name. */
  readonly label?: string | undefined;
  /** Passed to the viewport: mount only the rows in view. */
  readonly virtual?: boolean | VirtualOptions | undefined;
}

export interface SidebarProps<T> extends PaneProps<T> {
  /** The sidebar's tree from `useTree`; it owns the cursor and the expanded groups. */
  readonly tree: TreeHandleBase<T>;
  /** The header's leading content, such as the product name. */
  readonly heading?: ReactNode;
  /** The id of the open page. That row gets `data-current` and `aria-current="page"`. */
  readonly page?: string | null | undefined;
  /**
   * Called when the cursor moves onto a page (a row without children) by key, click or the
   * app; the app opens it, for example by passing its rows to the list.
   */
  onPageChange?(item: T): void;
}

/**
 * The navigation pane: a header and a Tree of single items and groups nested to any depth. The
 * tree's cursor is `data-highlighted`; the open page, which the app passes as `page`, is
 * `data-current`. The shell keeps neither: both live in the tree and the app.
 */
export function Sidebar<T>({
  tree,
  heading,
  page,
  onPageChange,
  label,
  virtual,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: SidebarProps<T>): ReactElement {
  const latest = useRef(onPageChange);
  useLayoutEffect(() => {
    latest.current = onPageChange;
  });
  // Report each move of the cursor onto a page; the tree's state is the only source.
  useLayoutEffect(() => {
    let highlighted = tree.state.get().highlighted;
    return tree.state.subscribe((state) => {
      if (state.highlighted === highlighted) return;
      highlighted = state.highlighted;
      const row = state.rows.find((candidate) => candidate.id === highlighted);
      if (row !== undefined && !row.getCanExpand()) latest.current?.(row.original);
    });
  }, [tree]);

  const state: PaneState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "aside",
    props: {
      ...mergeProps<"aside">({ "data-slot": "app-shell-sidebar" }, props, {
        children: (
          <>
            <div data-slot="app-shell-header">
              <span data-slot="app-shell-brand">{heading}</span>
              <LayerKeys tree={tree} commands={moves} />
            </div>
            <TreeRoot tree={tree} aria-label={label}>
              <Viewport tree={tree} virtual={virtual}>
                {(row) => (
                  <Row
                    row={row}
                    data-current={row.id === page ? "" : undefined}
                    aria-current={row.id === page ? "page" : undefined}
                    onPointerMove={keepCursor}
                  >
                    <Indent />
                    <Toggle />
                    {children(row)}
                  </Row>
                )}
              </Viewport>
            </TreeRoot>
          </>
        ),
      }),
      className,
      style,
    },
  });
}

export interface ListProps<T> extends PaneProps<T> {
  /**
   * The list from `useList`, usually nested with `getSubRows` (an idea's runs). It owns the
   * cursor and the expanded rows; control its `highlighted` value to drive the detail pane.
   */
  readonly list: TreeHandleBase<T>;
  /** The header's heading, such as the open page's name. */
  readonly heading?: ReactNode;
  /** Shown after the heading, such as the page's path. */
  readonly breadcrumb?: ReactNode;
}

/** The middle pane: a header and a List whose rows expand to show their children. */
export function List<T>({
  list,
  heading,
  breadcrumb,
  label,
  virtual,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: ListProps<T>): ReactElement {
  const state: PaneState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "section",
    props: {
      ...mergeProps<"section">({ "data-slot": "app-shell-list" }, props, {
        children: (
          <>
            <div data-slot="app-shell-header">
              <h1 data-slot="app-shell-title">{heading}</h1>
              {breadcrumb === undefined ? null : (
                <span data-slot="app-shell-breadcrumb">{breadcrumb}</span>
              )}
              <LayerKeys tree={list} commands={moves} />
            </div>
            <ListRoot tree={list} aria-label={label}>
              <Viewport tree={list} virtual={virtual}>
                {(row) => (
                  <Row row={row} onPointerMove={keepCursor}>
                    <Indent />
                    <Toggle />
                    {children(row)}
                  </Row>
                )}
              </Viewport>
            </ListRoot>
          </>
        ),
      }),
      className,
      style,
    },
  });
}
