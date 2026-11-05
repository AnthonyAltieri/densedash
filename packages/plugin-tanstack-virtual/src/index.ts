import {
  Virtualizer as TanStackVirtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "@tanstack/virtual-core";
import type { Virtualizer } from "@densedash/react";

export interface TanstackVirtualOptions {
  /**
   * Row height in pixels, including any space between rows. Match the rendered CSS height, or
   * give an estimate and set `measure`.
   */
  readonly estimateSize: (index: number) => number;
  /**
   * Measures mounted rows with TanStack's `measureElement` and follows their size changes, for
   * rows whose heights differ. Defaults to false: every row has the `estimateSize` height.
   */
  readonly measure?: boolean;
  /** Extra rows to mount on each side of the visible range. Defaults to eight. */
  readonly overscan?: number;
}

/**
 * Create once per viewport (for example with React's `useState` lazy initializer), then
 * pass to Tree.Viewport or List.Viewport. No kernel registration or React runtime is needed.
 * The viewport subscription owns the scroll/resize observers and releases them on unmount.
 */
export function tanstackVirtual(options: TanstackVirtualOptions): Virtualizer {
  let element: HTMLElement | null = null;
  const listeners = new Set<() => void>();
  let unmount: (() => void) | undefined;
  let target: number | null = null;
  let readOffset: (() => void) | undefined;
  const virtual = new TanStackVirtualizer<HTMLElement, HTMLElement>({
    count: 0,
    getScrollElement: () => element,
    estimateSize: options.estimateSize,
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
      return observeElementRect(instance, (rect) => {
        const previous = instance.scrollRect;
        notify(rect);
        // A smaller viewport can hide the cursor without changing its index.
        if (previous !== null && previous.height !== rect.height && target !== null) {
          scrollToIndex(target, "auto");
        }
      });
    },
    onChange() {
      for (const listener of listeners) listener();
    },
  });

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
      element = measurements.element;
      const changed =
        virtual.options.count !== measurements.count ||
        virtual.options.scrollMargin !== measurements.start;
      // Rows start below a sticky header: offset them by its height, and keep rows scrolled to
      // the top edge clear of it.
      virtual.setOptions({
        ...virtual.options,
        count: measurements.count,
        scrollMargin: measurements.start,
        scrollPaddingStart: measurements.start,
      });
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
  if (options.measure !== true) return strategy;
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
