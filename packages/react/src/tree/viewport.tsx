import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { NavigableTable, RowData } from "@densedash/core";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import { tanstackVirtual } from "../virtual/tanstack-virtual.js";
import type { VirtualOptions } from "../virtual/tanstack-virtual.js";
import { useTreeContext } from "./context.js";
import { getInternals } from "./handle.js";
import type { TreeHandleBase, TreeRow, TreeSnapshot } from "./handle.js";

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
  /** The row id at a visible index, for keying per-row caches such as measured sizes. */
  readonly rowKey?: ((index: number) => string) | undefined;
}

/**
 * The viewport's rendering strategy. The default strategy mounts every row, and `virtual`
 * mounts only a range with TanStack Virtual; pass your own strategy through
 * `<Tree.Viewport virtualizer={…}>` instead. Use one virtualizer per viewport.
 *
 * - `range()` and `padding()` are read during render; call the `subscribe` listener whenever
 *   they would return something new (after a scroll or a measurement), and the viewport
 *   re-renders.
 * - `sync()` runs when the rows change, before the render that shows them (so `range()` and
 *   `padding()` already fit the new rows), and in a layout effect after each render that
 *   changes the scroll element or the row count, before `scrollToIndex`.
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
  /**
   * Receives each mounted row's element and index after every render, before anchoring and
   * following, for rows whose heights differ. Leave it out when every row has the estimated
   * height.
   */
  measure?(element: HTMLElement, index: number): void;
}

export interface ViewportState {
  /** `virtual` or a virtualizer replaces the default strategy. */
  readonly virtualized: boolean;
}

export interface ViewportProps<T>
  extends ElementAttributes<HTMLDivElement>, PartProps<ViewportState> {
  /** The tree passed to the enclosing root; its item type types `row.original`. */
  readonly tree: TreeHandleBase<T>;
  /**
   * Renders one visible row, usually `(row) => <Tree.Row row={row}>…</Tree.Row>`. `row` is
   * TanStack's row from the expanded row model; `row.original` is the item. While this function
   * keeps its identity (the React Compiler memoizes inline functions), rows whose item, depth,
   * expansion and disabled state are unchanged skip rendering; highlight and selection
   * re-render only the rows they touch. A row whose only change is its position does not
   * re-render either: read positions from `tree.state` with `useStore`.
   */
  readonly children: (row: TreeRow<T>) => ReactNode;
  /**
   * Mounts only the rows in view plus `overscan`, with TanStack Virtual: `virtual` alone, or
   * `virtual={{ overscan, estimateSize, measure }}` to tune it. Rows are estimated at the
   * viewport's `--dd-row-height` and measured as they render. The viewport needs a constrained
   * block size. A new `overscan` or `measure` creates a new virtualizer; `estimateSize` is read
   * when used.
   */
  readonly virtual?: boolean | VirtualOptions | undefined;
  /** A custom rendering strategy, instead of `virtual`. Keep its identity stable. */
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

const rowKeys = new WeakMap<readonly TreeRow<unknown>[], (index: number) => string>();

// One key function per row model, so a virtualizer re-keys only when the rows change.
function rowKeyOf(rows: readonly TreeRow<unknown>[]): (index: number) => string {
  let found = rowKeys.get(rows);
  if (found === undefined) {
    found = (index) => rows[index]?.id ?? "";
    rowKeys.set(rows, found);
  }
  return found;
}

function rowElement(core: NavigableTable<RowData> | null, document: Document, id: string) {
  return core === null ? null : document.getElementById(core.getRowProps(id).id);
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

const CAN_EXPAND = 1;
const EXPANDED = 2;
const DISABLED = 4;

// TanStack row methods read live table state, so the viewport passes their answers along.
function rowFlags(row: TreeRow<unknown>): number {
  return (
    (row.getCanExpand() ? CAN_EXPAND : 0) |
    (row.getIsExpanded() ? EXPANDED : 0) |
    (row.getCanSelect() ? 0 : DISABLED)
  );
}

interface SlotProps {
  readonly row: TreeRow<unknown>;
  /** The row's expansion and disabled state when the viewport rendered. */
  readonly flags: number;
  readonly render: (row: TreeRow<unknown>) => ReactNode;
}

// Data updates create new row objects; rows whose item, depth and state are unchanged skip
// rendering. Position is left out: one insertion shifts every later row's index and every
// sibling's set size, and re-rendering them all costs several frames at thousands of rows.
// `Tree.Row` subscribes to its set position and `Table.Row` to its index instead. Row state
// (highlight, selection) reaches each row through its own subscription.
const RowSlot = memo(
  function RowSlot({ row, render }: SlotProps): ReactNode {
    return render(row);
  },
  (previous, next) =>
    previous.render === next.render &&
    previous.flags === next.flags &&
    previous.row.id === next.row.id &&
    Object.is(previous.row.original, next.row.original) &&
    previous.row.depth === next.row.depth &&
    previous.row.parentId === next.row.parentId,
);

interface BuiltIn {
  readonly key: string | null;
  readonly strategy: Virtualizer | undefined;
  /** Updated after each render, so `estimateSize` is the latest function. */
  readonly options: { -readonly [K in keyof VirtualOptions]: VirtualOptions[K] };
}

function createBuiltIn(key: string | null, virtual: VirtualOptions): BuiltIn {
  const options = { ...virtual };
  return { key, options, strategy: key === null ? undefined : tanstackVirtual(options) };
}

// The built-in virtualizer, created once per `virtual` setting rather than on every render.
function useBuiltIn(virtual: boolean | VirtualOptions | undefined): Virtualizer | undefined {
  const options = typeof virtual === "object" ? virtual : {};
  const key =
    virtual === undefined || virtual === false
      ? null
      : `${options.overscan ?? ""}:${options.measure !== false}`;
  const [created, setCreated] = useState(() => createBuiltIn(key, options));
  let builtIn = created;
  if (created.key !== key) {
    builtIn = createBuiltIn(key, options);
    setCreated(builtIn);
  }
  useLayoutEffect(() => {
    builtIn.options.estimateSize = options.estimateSize;
  });
  return builtIn.strategy;
}

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
  virtual,
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
  if (virtual !== undefined && virtual !== false && virtualizer !== undefined) {
    throw new Error(
      "densedash: pass `virtual` or `virtualizer` to a viewport, not both; `virtualizer` replaces the built-in `virtual` strategy.",
    );
  }
  const { core } = context;
  const rows = useStore(tree.state, selectRows);
  const highlighted = useStore(tree.state, selectHighlighted);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const startSpacer = useRef<HTMLDivElement>(null);
  const headed = header !== undefined && header !== null;
  const locate = useRef((_index: number): HTMLElement | null => null);
  const [allRows] = useState(() => createAllRows(locate));
  const builtIn = useBuiltIn(virtual);
  const active = virtualizer ?? builtIn;
  const strategy: Virtualizer = active ?? allRows;
  const version = useVersion(active);
  const anchor = useRef<{
    readonly id: string;
    readonly top: number;
  } | null>(null);
  // The header's height as last passed to `sync`.
  const headerStart = useRef(0);

  useLayoutEffect(() => {
    locate.current = (index) => {
      const row = tree.state.get().rows[index];
      return row === undefined || element === null
        ? null
        : rowElement(core, element.ownerDocument, row.id);
    };
  });

  const { start, end, padding } = readLayout(strategy, rows.length, version);

  // Sync before following or anchoring, including the initial mount.
  useLayoutEffect(() => {
    if (element === null) return;
    // The first spacer follows the header, so its offset in the scroll content is the header's height.
    const spacer = startSpacer.current;
    const measureHeader = () =>
      spacer === null
        ? 0
        : spacer.getBoundingClientRect().top -
          element.getBoundingClientRect().top -
          element.clientTop +
          element.scrollTop;
    headerStart.current = measureHeader();
    strategy.sync?.({
      element,
      count: rows.length,
      start: headerStart.current,
      rowKey: rowKeyOf(rows),
    });
    const view = element.ownerDocument.defaultView;
    if (spacer === null || view === null || !("ResizeObserver" in view)) return;
    // A theme, density or content change can resize the header without a render here.
    const observer = new view.ResizeObserver(() => {
      const next = measureHeader();
      if (next === headerStart.current) return;
      headerStart.current = next;
      const current = tree.state.get().rows;
      strategy.sync?.({ element, count: current.length, start: next, rowKey: rowKeyOf(current) });
    });
    for (
      let node = spacer.previousElementSibling;
      node !== null;
      node = node.previousElementSibling
    )
      observer.observe(node);
    return () => observer.disconnect();
  }, [tree, strategy, element, rows.length, headed]);

  // Measure mounted rows before anchoring and following, so both use their real sizes.
  useLayoutEffect(() => {
    if (element === null || strategy.measure === undefined) return;
    for (let index = start; index < end; index++) {
      const row = rows[index];
      const target = row === undefined ? null : rowElement(core, element.ownerDocument, row.id);
      if (target !== null && element.contains(target)) strategy.measure(target, index);
    }
  });

  // Measure before React commits new rows: the store notifies while the old rows are on screen.
  useLayoutEffect(() => {
    if (element === null) return;
    let previous = tree.state.get();
    const unsubscribe = tree.state.subscribe((next) => {
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
        const index = before.rows.findIndex((row) => row.id === before.highlighted);
        if (index >= 0) {
          anchor.current = {
            id: before.highlighted,
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
      const row = before.rows.find((row) => core?.getRowProps(row.id).id === target.id);
      if (row === undefined) return;
      anchor.current = {
        id: row.id,
        top: target.getBoundingClientRect().top - element.getBoundingClientRect().top,
      };
    });
    // Subscribed after the anchor, which reads the old geometry first. Passing the new rows
    // before the render that shows them gives that render spacers that fit them, so restoring
    // the anchor near the end is not clamped to the old scroll height for a frame.
    let synced = previous.rows;
    const unsync = tree.state.subscribe((next) => {
      if (next.rows === synced) return;
      synced = next.rows;
      strategy.sync?.({
        element,
        count: synced.length,
        start: headerStart.current,
        rowKey: rowKeyOf(synced),
      });
    });
    return () => {
      unsubscribe();
      unsync();
    };
  }, [tree, core, element, strategy]);

  useLayoutEffect(() => {
    const saved = anchor.current;
    anchor.current = null;
    if (saved === null || element === null) return;
    if (strategy.offsetForIndex !== undefined) {
      const index = rows.findIndex((row) => row.id === saved.id);
      if (index >= 0) {
        element.scrollTop = strategy.offsetForIndex(index) + element.clientTop - saved.top;
      }
      return;
    }
    const target = rowElement(core, element.ownerDocument, saved.id);
    if (target === null || !element.contains(target)) return;
    const moved = target.getBoundingClientRect().top - element.getBoundingClientRect().top;
    if (moved !== saved.top) element.scrollTop += moved - saved.top;
  }, [rows, core, element, strategy]);

  // Follow after restoring the anchor so the final scroll always reveals the highlight.
  useLayoutEffect(() => {
    if (highlighted === null || getInternals(tree).highlightReason() === "pointer") return;
    const index = rows.findIndex((row) => row.id === highlighted);
    if (index >= 0) strategy.scrollToIndex(index, "auto");
  }, [tree, highlighted, strategy, element, rows]);

  const renderRow = children as (row: TreeRow<unknown>) => ReactNode;
  const items = useMemo(
    () =>
      rows
        .slice(start, end)
        .map((row) => <RowSlot key={row.id} row={row} flags={rowFlags(row)} render={renderRow} />),
    [rows, start, end, renderRow],
  );
  const state: ViewportState = { virtualized: active !== undefined };
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
