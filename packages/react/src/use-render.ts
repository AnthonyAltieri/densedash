import { cloneElement, createElement, isValidElement, useMemo } from "react";
import type { CSSProperties, HTMLAttributes, JSX, ReactElement, Ref, RefCallback } from "react";
import { merge, withEscapeHatch } from "./merge-props.js";
import type { DataAttributes } from "./merge-props.js";

/** Props a render function receives: spread them on the element it returns. */
export interface RenderProps extends HTMLAttributes<HTMLElement>, DataAttributes {
  ref?: RefCallback<HTMLElement> | undefined;
}

/**
 * Replaces a part's default element. An element is cloned with the part's props merged
 * under its own; a function receives the props and the part's state.
 */
export type RenderProp<State> = ReactElement | ((props: RenderProps, state: State) => ReactElement);

/** `className` and `style` accept a value or a function of the part's state. */
export interface StyleProps<State> {
  className?: string | ((state: State) => string | undefined) | undefined;
  style?: CSSProperties | ((state: State) => CSSProperties | undefined) | undefined;
}

/** The props every part adds to its element's props. */
export interface PartProps<State> extends StyleProps<State> {
  render?: RenderProp<State> | undefined;
}

type MaybeRef = Ref<HTMLElement> | undefined;

export interface UseRenderParameters<State> {
  render?: RenderProp<State> | undefined;
  /** Rendered when `render` is absent. Defaults to `div`. */
  defaultTagName?: keyof JSX.IntrinsicElements | undefined;
  /** One ref, or two to merge (for example the consumer's ref and the part's own). */
  ref?: MaybeRef | readonly [MaybeRef, MaybeRef?];
  /** Exposed to `render`, `className` and `style`, and as `data-*` attributes. */
  state?: State | undefined;
  /** Already-merged props: a `mergeProps` result or a plain object. */
  props?: (object & StyleProps<State>) | (Record<string, unknown> & StyleProps<State>) | undefined;
}

type ReadonlyState = object;

function stateAttributes(state: ReadonlyState): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(state)) {
    const name = `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    if (value === true) attributes[name] = "";
    else if (typeof value === "string" || typeof value === "number") attributes[name] = `${value}`;
  }
  return attributes;
}

function assignRef(ref: Ref<HTMLElement> | undefined, element: HTMLElement | null): () => void {
  if (typeof ref === "function") {
    const cleanup = ref(element);
    return typeof cleanup === "function" ? cleanup : () => ref(null);
  }
  if (ref !== null && ref !== undefined) {
    ref.current = element;
    return () => {
      ref.current = null;
    };
  }
  return () => {};
}

function useMergedRef(first: MaybeRef, second: MaybeRef, third: MaybeRef) {
  return useMemo((): RefCallback<HTMLElement> | undefined => {
    const refs = [first, second, third].filter((ref) => ref !== undefined && ref !== null);
    if (refs.length === 0) return undefined;
    return (element) => {
      const cleanups = refs.map((ref) => assignRef(ref, element));
      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    };
  }, [first, second, third]);
}

const noState = {};

function isRefPair(ref: UseRenderParameters<object>["ref"]): ref is readonly [MaybeRef, MaybeRef?] {
  return Array.isArray(ref);
}

/**
 * Renders a part's element: resolves `className` and `style` against `state`, adds state as
 * `data-*` attributes, merges refs (including the `render` element's own ref) and applies
 * `render`. Pass already-merged props, usually `mergeProps(partProps, userProps)`.
 */
export function useRender<State extends object = Record<string, never>>({
  render,
  defaultTagName = "div",
  ref,
  state,
  props = {},
}: UseRenderParameters<State>): ReactElement {
  const resolvedState = (state ?? noState) as State;
  const elementRef = isValidElement<{ ref?: Ref<HTMLElement> }>(render)
    ? render.props.ref
    : undefined;
  const [first, second] = isRefPair(ref) ? ref : [ref];
  const mergedRef = useMergedRef(first, second, elementRef);
  const { className, style, ...rest } = props as StyleProps<State> & Record<string, unknown>;
  const resolved: Record<string, unknown> = {
    ...stateAttributes(resolvedState),
    ...rest,
    className: typeof className === "function" ? className(resolvedState) : className,
    style: typeof style === "function" ? style(resolvedState) : style,
    ref: mergedRef,
  };
  if (typeof render === "function") {
    return render(withEscapeHatch(merge([resolved])) as RenderProps, resolvedState);
  }
  if (render !== undefined) {
    const { ref: _ownRef, ...own } = render.props as Record<string, unknown>;
    return cloneElement(render, withEscapeHatch(merge([resolved, own])));
  }
  return createElement(defaultTagName, withEscapeHatch(merge([resolved])));
}
