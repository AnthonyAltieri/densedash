import type { ComponentPropsWithRef, JSX } from "react";

/** `data-*` attributes, which parts use for slots and state. */
export interface DataAttributes {
  readonly [attribute: `data-${string}`]: string | number | boolean | undefined;
}

/** Props of an intrinsic element plus `data-*` attributes. */
export type ElementProps<Tag extends keyof JSX.IntrinsicElements = "div"> =
  ComponentPropsWithRef<Tag> & DataAttributes;

/**
 * An event passed to handlers on parts and `useRender` elements. Calling
 * `preventDensedashHandler()` synchronously skips the handlers from earlier props objects, which
 * is how a consumer stops a part's own handler; with nothing to skip it does nothing. Annotate
 * the handler with the element's event, e.g. `DensedashEvent<React.FocusEvent<HTMLDivElement>>`.
 */
export type DensedashEvent<E> = E & { preventDensedashHandler(): void };

type AnyProps = Record<string, unknown>;
type Handler = (event: unknown, ...rest: unknown[]) => unknown;

const handlerName = /^on[A-Z]/;

function chain(earlier: Handler, later: Handler): Handler {
  return (event, ...rest) => {
    let stopped = false;
    if (typeof event === "object" && event !== null) {
      // React shares one synthetic event across the propagation path, so the escape hatch is
      // installed per call and removed afterwards instead of being recorded on the event.
      const target = event as { preventDensedashHandler?: () => void };
      const previous = target.preventDensedashHandler;
      target.preventDensedashHandler = () => {
        stopped = true;
      };
      try {
        later(event, ...rest);
      } finally {
        if (previous === undefined) delete target.preventDensedashHandler;
        else target.preventDensedashHandler = previous;
      }
    } else {
      later(event, ...rest);
    }
    if (!stopped) earlier(event, ...rest);
  };
}

/**
 * Merges props objects left to right; later values win and `undefined` never overrides.
 * - `on*` handlers chain: the last object's handler runs first, and calling
 *   `event.preventDensedashHandler()` skips the handlers from earlier objects.
 * - `className` strings join with a space; `style` objects merge shallowly.
 * - `ref` keeps the last value; pass several refs to `useRender({ ref: [a, b] })` to merge them.
 */
export function mergeProps<Tag extends keyof JSX.IntrinsicElements = "div">(
  ...sources: readonly (ElementProps<Tag> | undefined)[]
): ElementProps<Tag> {
  return merge(sources) as ElementProps<Tag>;
}

const noop: Handler = () => {};

/** Gives every handler the escape hatch, even when no earlier handler exists to skip. */
export function withEscapeHatch(props: AnyProps): AnyProps {
  for (const [key, value] of Object.entries(props)) {
    if (handlerName.test(key) && typeof value === "function") {
      props[key] = chain(noop, value as Handler);
    }
  }
  return props;
}

/** Untyped core of `mergeProps`, shared with `useRender`. */
export function merge(sources: readonly (object | undefined)[]): AnyProps {
  const merged: AnyProps = {};
  for (const source of sources) {
    if (source === undefined) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;
      const previous = merged[key];
      if (previous === undefined) {
        merged[key] = value;
      } else if (key === "className" && typeof previous === "string" && typeof value === "string") {
        merged[key] = `${previous} ${value}`;
      } else if (key === "style" && typeof previous === "object" && typeof value === "object") {
        merged[key] = { ...previous, ...value };
      } else if (
        handlerName.test(key) &&
        typeof previous === "function" &&
        typeof value === "function"
      ) {
        merged[key] = chain(previous as Handler, value as Handler);
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
}
