import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Key, Tree as CoreTree, TreeRow, TreeSnapshot } from "@densedash/core";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import { useTreeContext } from "./context.js";
import { getInternals } from "./handle.js";
import type { TreeHandle } from "./handle.js";

/** Visible row indices to mount: `start` inclusive, `end` exclusive. */
export interface ViewportRange {
  readonly start: number;
  readonly end: number;
}

/** What the viewport tells its virtualizer after each render. */
export interface ViewportMeasurements {
  /** The viewport's scroll element. */
  readonly element: HTMLElement;
  /** The number of visible rows (expanded rows and their visible descendants). */
  readonly count: number;
  /**
   * Pixels of scroll content before the first row: the height of a sticky `header`, else 0.
   * Rows start this far down, and a row scrolled to the top edge must clear it.
   */
  readonly start: number;
}

/**
 * The viewport's rendering strategy. The default strategy mounts every row; pass a
 * virtualizer through `<Tree.Viewport virtualizer={…}>` to mount only a range. Use one
 * virtualizer per viewport.
 *
 * - `range()` and `padding()` are read during render; call the `subscribe` listener whenever
 *   they would return something new (after a scroll or a measurement), and the viewport
 *   re-renders.
 * - `sync()` runs in a layout effect after each render that changes the scroll element or the
 *   row count, before `scrollToIndex`.
 * - `scrollToIndex()` brings the highlighted row into view after keyboard and programmatic
 *   moves (never for pointer hover): `"auto"` scrolls the least distance, `"center"` centers it.
 *   Mount that row once it is in range, since the root's `aria-activedescendant` points at it.
 */
export interface Virtualizer {
  range(): ViewportRange;
  scrollToIndex(index: number, align: "auto" | "center"): void;
  sync?(measurements: ViewportMeasurements): void;
  subscribe?(listener: () => void): () => void;
  /** Pixels before the first mounted row and after the last, so the scroll height covers every row. */
  padding?(): { readonly start: number; readonly end: number };
  /** Row start in scroll-content pixels, used to anchor data updates even if the row unmounts. */
  offsetForIndex?(index: number): number;
}

export interface ViewportState {
  /** A virtualizer replaces the default strategy. */
  readonly virtualized: boolean;
}

export interface ViewportProps<T>
  extends ElementAttributes<HTMLDivElement>, PartProps<ViewportState> {
  /** The tree passed to the enclosing root; its item type types `row.item`. */
  readonly tree: TreeHandle<T>;
  /**
   * Renders one visible row, usually `(row) => <Tree.Row row={row}>…</Tree.Row>`. While this
   * function keeps its identity (the React Compiler memoizes inline functions), rows whose data
   * is unchanged skip rendering; highlight and selection re-render only the rows they touch.
   * A row whose only change is its position does not re-render either, so `row.index`,
   * `row.posInSet` and `row.setSize` can be stale here and in `Tree.Row`'s render props: read
   * positions from `tree.state` with `useStore` instead.
   */
  readonly children: (row: TreeRow<T>) => ReactNode;
  readonly virtualizer?: Virtualizer | undefined;
  /**
   * Rendered first inside the scroll element, before the rows, such as a header row styled
   * `position: sticky`. Its height is measured and passed to the virtualizer as `start`, and
   * keyboard moves scroll rows clear of it.
   */
  readonly header?: ReactNode;
}

const selectRows = (state: TreeSnapshot<unknown>) => state.rows;
const selectHighlighted = (state: TreeSnapshot<unknown>) => state.highlighted;

function rowElement(core: CoreTree<unknown> | null, document: Document, key: Key) {
  return core === null ? null : document.getElementById(core.getRowProps(key).id);
}

/**
 * Scrolls `target` into the viewport's client box below its first `start` pixels (a sticky
 * header), or into the page when the viewport does not scroll.
 */
function reveal(
  viewport: HTMLElement,
  target: HTMLElement,
  align: "auto" | "center",
  start: number,
): void {
  if (viewport.scrollHeight <= viewport.clientHeight) {
    target.scrollIntoView({ block: align === "center" ? "center" : "nearest" });
    return;
  }
  const box = viewport.getBoundingClientRect();
  const edge = box.top + viewport.clientTop;
  const top = edge + start;
  const bottom = edge + viewport.clientHeight;
  const rect = target.getBoundingClientRect();
  if (align === "center") viewport.scrollTop += (rect.top + rect.bottom) / 2 - (top + bottom) / 2;
  else if (rect.top < top) viewport.scrollTop -= top - rect.top;
  else if (rect.bottom > bottom) viewport.scrollTop += rect.bottom - bottom;
}

/** The default strategy: every row is mounted, and scrolling uses the row's element. */
function createAllRows(locate: { current: (index: number) => HTMLElement | null }) {
  let viewport: HTMLElement | null = null;
  let start = 0;
  return {
    // The viewport clamps the range to the row count.
    range: () => ({ start: 0, end: Infinity }),
    sync(measurements: ViewportMeasurements) {
      viewport = measurements.element;
      start = measurements.start;
    },
    scrollToIndex(index: number, align: "auto" | "center") {
      const target = locate.current(index);
      if (viewport !== null && target !== null) reveal(viewport, target, align, start);
    },
  } satisfies Virtualizer;
}

// The first mounted row whose bottom edge is below the viewport's top edge (rows are in order).
function firstVisibleRow(viewport: HTMLElement): HTMLElement | null {
  const rows = viewport.querySelectorAll<HTMLElement>(
    '[data-slot="tree-row"], [data-slot="table-row"]',
  );
  const top = viewport.getBoundingClientRect().top + viewport.clientTop;
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (rows[middle]!.getBoundingClientRect().bottom <= top) low = middle + 1;
    else high = middle;
  }
  return rows[low] ?? null;
}

// Position fields are left out: one insertion shifts every later row's index and every
// sibling's set size, and re-rendering them all costs several frames at thousands of rows.
// `Tree.Row` subscribes to its set position and `Table.Row` to its index instead.
const fields = [
  "key",
  "item",
  "depth",
  "parentKey",
  "hasChildren",
  "expanded",
  "disabled",
  "textValue",
] as const satisfies readonly (keyof TreeRow<unknown>)[];

interface SlotProps {
  readonly row: TreeRow<unknown>;
  readonly render: (row: TreeRow<unknown>) => ReactNode;
}

// Data updates create new row objects; rows whose fields are unchanged skip rendering. Row
// state (highlight, selection) reaches each row through its own subscription.
const RowSlot = memo(
  function RowSlot({ row, render }: SlotProps): ReactNode {
    return render(row);
  },
  (previous, next) =>
    previous.render === next.render &&
    fields.every((field) => Object.is(previous.row[field], next.row[field])),
);

function useVersion(virtualizer: Virtualizer | undefined): number {
  const [version, setVersion] = useState(0);
  useLayoutEffect(() => {
    if (virtualizer?.subscribe === undefined) return;
    const changed = () => setVersion((current) => current + 1);
    const unsubscribe = virtualizer.subscribe(changed);
    // The strategy may have changed between render and subscribing.
    changed();
    return unsubscribe;
  }, [virtualizer]);
  return version;
}

// Read during render with the version as an argument, so memoizing compilers re-read it.
function readLayout(strategy: Virtualizer, count: number, _version: number) {
  const range = strategy.range();
  const start = Math.max(0, Math.min(count, Math.floor(range.start)));
  const end = Math.max(start, Math.min(count, Math.ceil(range.end)));
  return { start, end, padding: strategy.padding?.() };
}

/**
 * The scroll container. It renders visible rows through `children`, keeps the highlighted
 * row in view and, when rows are inserted or removed above it, keeps the highlighted row (or
 * the first visible row) at the same screen position.
 */
export function Viewport<T>({
  tree,
  children,
  virtualizer,
  header,
  render,
  ref,
  className,
  style,
  ...props
}: ViewportProps<T>): ReactElement {
  const context = useTreeContext("<Tree.Viewport>");
  if (context.handle !== tree) {
    throw new Error("densedash: pass the root's tree to its viewport.");
  }
  const { core } = context;
  const rows = useStore(tree.state, selectRows);
  const highlighted = useStore(tree.state, selectHighlighted);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const startSpacer = useRef<HTMLDivElement>(null);
  const headed = header !== undefined && header !== null;
  const locate = useRef((_index: number): HTMLElement | null => null);
  const [allRows] = useState(() => createAllRows(locate));
  const strategy: Virtualizer = virtualizer ?? allRows;
  const version = useVersion(virtualizer);
  const anchor = useRef<{
    readonly key: Key;
    readonly top: number;
  } | null>(null);

  useLayoutEffect(() => {
    locate.current = (index) => {
      const row = tree.state.get().rows[index];
      return row === undefined || element === null
        ? null
        : rowElement(core, element.ownerDocument, row.key);
    };
  });

  // Sync before following or anchoring, including the initial mount.
  useLayoutEffect(() => {
    if (element === null) return;
    // The first spacer follows the header, so its offset in the scroll content is the header's height.
    const spacer = startSpacer.current;
    const measure = () =>
      spacer === null
        ? 0
        : spacer.getBoundingClientRect().top -
          element.getBoundingClientRect().top -
          element.clientTop +
          element.scrollTop;
    let start = measure();
    strategy.sync?.({ element, count: rows.length, start });
    const view = element.ownerDocument.defaultView;
    if (spacer === null || view === null || !("ResizeObserver" in view)) return;
    // A theme, density or content change can resize the header without a render here.
    const observer = new view.ResizeObserver(() => {
      const next = measure();
      if (next === start) return;
      start = next;
      strategy.sync?.({ element, count: tree.state.get().rows.length, start });
    });
    for (
      let node = spacer.previousElementSibling;
      node !== null;
      node = node.previousElementSibling
    )
      observer.observe(node);
    return () => observer.disconnect();
  }, [tree, strategy, element, rows.length, headed]);

  // Measure before React commits new rows: the store notifies while the old rows are on screen.
  useLayoutEffect(() => {
    if (element === null) return;
    let previous = tree.state.get();
    return tree.state.subscribe((next) => {
      const before = previous;
      previous = next;
      if (next.highlighted !== before.highlighted) {
        anchor.current = null;
        return;
      }
      // Several model updates can precede one commit; keep the original screen position.
      if (next.rows === before.rows || anchor.current !== null) return;
      // Another command may have scrolled before the virtual range mounts the highlight.
      // Resolve its position from the model rather than anchoring an unrelated mounted row.
      if (before.highlighted !== null && strategy.offsetForIndex !== undefined) {
        const index = before.rows.findIndex((row) => row.key === before.highlighted);
        if (index >= 0) {
          anchor.current = {
            key: before.highlighted,
            top: strategy.offsetForIndex(index) + element.clientTop - element.scrollTop,
          };
          return;
        }
      }
      const target =
        (before.highlighted === null
          ? null
          : rowElement(core, element.ownerDocument, before.highlighted)) ??
        firstVisibleRow(element);
      if (target === null || !element.contains(target)) return;
      const row = before.rows.find((row) => core?.getRowProps(row.key).id === target.id);
      if (row === undefined) return;
      anchor.current = {
        key: row.key,
        top: target.getBoundingClientRect().top - element.getBoundingClientRect().top,
      };
    });
  }, [tree, core, element, strategy]);

  useLayoutEffect(() => {
    const saved = anchor.current;
    anchor.current = null;
    if (saved === null || element === null) return;
    if (strategy.offsetForIndex !== undefined) {
      const index = rows.findIndex((row) => row.key === saved.key);
      if (index >= 0) {
        element.scrollTop = strategy.offsetForIndex(index) + element.clientTop - saved.top;
      }
      return;
    }
    const target = rowElement(core, element.ownerDocument, saved.key);
    if (target === null || !element.contains(target)) return;
    const moved = target.getBoundingClientRect().top - element.getBoundingClientRect().top;
    if (moved !== saved.top) element.scrollTop += moved - saved.top;
  }, [rows, core, element, strategy]);

  // Follow after restoring the anchor so the final scroll always reveals the highlight.
  useLayoutEffect(() => {
    if (highlighted === null || getInternals(tree).highlightReason() === "pointer") return;
    const index = rows.findIndex((row) => row.key === highlighted);
    if (index >= 0) strategy.scrollToIndex(index, "auto");
  }, [tree, highlighted, strategy, element, rows]);

  const { start, end, padding } = readLayout(strategy, rows.length, version);
  const renderRow = children as (row: TreeRow<unknown>) => ReactNode;
  const items = useMemo(
    () =>
      rows.slice(start, end).map((row) => <RowSlot key={row.key} row={row} render={renderRow} />),
    [rows, start, end, renderRow],
  );
  const state: ViewportState = { virtualized: virtualizer !== undefined };
  return useRender({
    render,
    ref: [ref, setElement],
    state,
    props: {
      ...mergeProps(
        {
          "data-slot": "tree-viewport",
          children: (
            <>
              {header}
              {padding === undefined && !headed ? null : (
                <div
                  ref={startSpacer}
                  data-slot="tree-viewport-spacer"
                  aria-hidden
                  style={{ blockSize: padding?.start ?? 0 }}
                />
              )}
              {items}
              {padding === undefined ? null : (
                <div
                  data-slot="tree-viewport-spacer"
                  aria-hidden
                  style={{ blockSize: padding.end }}
                />
              )}
            </>
          ),
        },
        props,
      ),
      className,
      style,
    },
  });
}
