import {
  Virtualizer as TanStackVirtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "@tanstack/virtual-core";
import type { Virtualizer } from "@densedash/react";

export interface TanstackVirtualOptions {
  /** Row height in pixels, including any space between rows. Match the rendered CSS height. */
  readonly estimateSize: (index: number) => number;
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
  const virtual = new TanStackVirtualizer<HTMLElement, HTMLElement>({
    count: 0,
    getScrollElement: () => element,
    estimateSize: options.estimateSize,
    overscan: options.overscan ?? 8,
    scrollToFn: elementScroll,
    observeElementOffset,
    observeElementRect(instance, notify) {
      return observeElementRect(instance, (rect) => {
        const previous = instance.scrollRect;
        notify(rect);
        // A smaller viewport can hide the cursor without changing its index.
        if (previous !== null && previous.height !== rect.height && target !== null) {
          instance.scrollToIndex(target, { align: "auto", behavior: "instant" });
        }
      });
    },
    onChange() {
      for (const listener of listeners) listener();
    },
  });

  return {
    range() {
      const items = virtual.getVirtualItems();
      const first = items[0];
      const last = items[items.length - 1];
      return { start: first?.index ?? 0, end: last === undefined ? 0 : last.index + 1 };
    },
    padding() {
      const items = virtual.getVirtualItems();
      return {
        start: items[0]?.start ?? 0,
        end: Math.max(0, virtual.getTotalSize() - (items[items.length - 1]?.end ?? 0)),
      };
    },
    offsetForIndex(index) {
      // Refresh TanStack's public measurement cache after count changes.
      virtual.getTotalSize();
      return virtual.measurementsCache[index]?.start ?? 0;
    },
    scrollToIndex(index, align) {
      target = index;
      virtual.scrollToIndex(index, { align, behavior: "instant" });
    },
    sync(measurements) {
      element = measurements.element;
      const countChanged = virtual.options.count !== measurements.count;
      virtual.setOptions({ ...virtual.options, count: measurements.count });
      if (listeners.size > 0) virtual._willUpdate();
      // The current render read the previous count's spacer size. TanStack need not emit a
      // range change when only offscreen rows changed, so publish the new geometry too.
      if (countChanged) {
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
}
