import {
  Virtualizer as TanStackVirtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "@tanstack/virtual-core";
import type { Virtualizer } from "../tree/viewport.js";
import { readRowHeight } from "./row-height.js";

const byIndex = (index: number) => index;

/** Options for `virtual={…}` on a viewport and for `tanstackVirtual(…)`. */
export interface VirtualOptions {
  /** Extra rows to mount on each side of the visible range. Defaults to eight. */
  readonly overscan?: number | undefined;
  /**
   * Row height in pixels for rows not measured yet, including any space between rows. Defaults
   * to the viewport's computed `--dd-row-height`, read again when a `data-dd-density` attribute
   * changes or the viewport resizes, so the estimate follows the density setting.
   */
  readonly estimateSize?: ((index: number) => number) | undefined;
  /**
   * Measures mounted rows as they render with TanStack's `measureElement` and follows their
   * size changes, for rows whose heights differ (two-line rows, expanded detail). A measured
   * size belongs to its row id, so it follows the row through insertions and sorts. Defaults
   * to true; pass false when every row has the estimated height.
   */
  readonly measure?: boolean | undefined;
}

/**
 * The TanStack Virtual strategy behind `virtual`, for passing to `virtualizer={…}` yourself.
 * Create one per viewport (for example with React's `useState` lazy initializer). The
 * viewport subscription owns the scroll, resize and density observers and releases them on
 * unmount. `estimateSize` and `measure` are read from `options` when used.
 */
export function tanstackVirtual(options: VirtualOptions = {}): Virtualizer {
  let element: HTMLElement | null = null;
  const listeners = new Set<() => void>();
  let unmount: (() => void) | undefined;
  let target: number | null = null;
  let readOffset: (() => void) | undefined;
  let rowHeight = 0;
  let rowKey: ((index: number) => string) | undefined;
  const virtual = new TanStackVirtualizer<HTMLElement, HTMLElement>({
    count: 0,
    getScrollElement: () => element,
    getItemKey: byIndex,
    estimateSize: (index) => options.estimateSize?.(index) ?? rowHeight,
    overscan: options.overscan ?? 8,
    scrollToFn(offset, scrollOptions, instance) {
      elementScroll(offset, scrollOptions, instance);
      // Instant writes can be followed by another command before the browser emits scroll.
      // Publish the read-back now so both the range and auto alignment use that position.
      readOffset?.();
    },
    observeElementOffset(instance, notify) {
      readOffset = () => {
        if (instance.scrollElement !== null) {
          notify(instance.scrollElement.scrollTop, instance.isScrolling);
        }
      };
      const cleanup = observeElementOffset(instance, notify);
      return () => {
        readOffset = undefined;
        cleanup?.();
      };
    },
    observeElementRect(instance, notify) {
      const scrollElement = instance.scrollElement;
      const view = scrollElement?.ownerDocument.defaultView;
      let density: MutationObserver | null = null;
      if (scrollElement !== null && view !== null && view !== undefined) {
        // Density settings set `data-dd-density` on an ancestor, which changes the token
        // without resizing the viewport.
        density = new view.MutationObserver(() => readRowHeights(scrollElement));
        density.observe(scrollElement.ownerDocument.documentElement, {
          attributes: true,
          attributeFilter: ["data-dd-density"],
          subtree: true,
        });
      }
      const cleanup = observeElementRect(instance, (rect) => {
        const previous = instance.scrollRect;
        if (scrollElement !== null) readRowHeights(scrollElement);
        notify(rect);
        // A smaller viewport can hide the cursor without changing its index.
        if (previous !== null && previous.height !== rect.height && target !== null) {
          scrollToIndex(target, "auto");
        }
      });
      return () => {
        density?.disconnect();
        cleanup?.();
      };
    },
    onChange() {
      for (const listener of listeners) listener();
    },
  });

  // Re-estimates every row that is not measured yet when the token's value changes.
  function readRowHeights(scrollElement: HTMLElement): void {
    const next = readRowHeight(scrollElement);
    if (next === rowHeight) return;
    rowHeight = next;
    if (options.estimateSize === undefined) virtual.measure();
  }

  // Sizes keyed by id outlive their rows. Once the cache holds more sizes than there are rows,
  // some belong to removed rows: drop those, so a live feed's cache stays within the row count.
  function forgetRemovedRows(): void {
    const sizes = virtual.itemSizeCache;
    const { count, getItemKey } = virtual.options;
    if (sizes.size <= count) return;
    const live = new Set<unknown>();
    for (let index = 0; index < count; index++) live.add(getItemKey(index));
    for (const key of sizes.keys()) if (!live.has(key)) sizes.delete(key);
  }

  function scrollToIndex(index: number, align: "auto" | "center"): void {
    target = index;
    // Anchoring writes scrollTop directly; read it before TanStack chooses auto alignment.
    readOffset?.();
    virtual.scrollToIndex(index, { align, behavior: "instant" });
  }

  const strategy: Virtualizer = {
    range() {
      const items = virtual.getVirtualItems();
      const first = items[0];
      const last = items[items.length - 1];
      return { start: first?.index ?? 0, end: last === undefined ? 0 : last.index + 1 };
    },
    padding() {
      // Item offsets include the scroll margin (the viewport's header); the spacers follow it.
      const items = virtual.getVirtualItems();
      const margin = virtual.options.scrollMargin;
      return {
        start: Math.max(0, (items[0]?.start ?? margin) - margin),
        end: Math.max(
          0,
          virtual.getTotalSize() - ((items[items.length - 1]?.end ?? margin) - margin),
        ),
      };
    },
    offsetForIndex(index) {
      // Refresh TanStack's public measurement cache after count changes.
      virtual.getTotalSize();
      return virtual.measurementsCache[index]?.start ?? 0;
    },
    scrollToIndex,
    sync(measurements) {
      if (element !== measurements.element) readRowHeights(measurements.element);
      element = measurements.element;
      const keyed = measurements.rowKey !== rowKey;
      const changed =
        keyed ||
        virtual.options.count !== measurements.count ||
        virtual.options.scrollMargin !== measurements.start;
      rowKey = measurements.rowKey;
      // Rows start below a sticky header: offset them by its height, and keep rows scrolled to
      // the top edge clear of it. Measured sizes are keyed by row id, so they follow their rows
      // through insertions and sorts; a new key function makes TanStack re-lay out every row.
      virtual.setOptions({
        ...virtual.options,
        count: measurements.count,
        getItemKey: rowKey ?? byIndex,
        scrollMargin: measurements.start,
        scrollPaddingStart: measurements.start,
      });
      if (keyed) forgetRemovedRows();
      if (listeners.size > 0) virtual._willUpdate();
      // The current render read the previous geometry's spacer sizes. TanStack need not emit a
      // range change when only offscreen rows changed, so publish the new geometry too.
      if (changed) {
        for (const listener of listeners) listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        unmount = virtual._didMount();
        virtual._willUpdate();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unmount?.();
          unmount = undefined;
          element = null;
          target = null;
        }
      };
    },
  };
  if (options.measure === false) return strategy;
  return {
    ...strategy,
    measure(row, index) {
      // TanStack reads the index from this attribute, also when its ResizeObserver reports a
      // later size change. The viewport rewrites it after every render, so it stays current.
      row.setAttribute(virtual.options.indexAttribute, String(index));
      virtual.measureElement(row);
    },
  };
}
