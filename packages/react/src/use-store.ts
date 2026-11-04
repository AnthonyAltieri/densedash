import { useCallback, useMemo, useSyncExternalStore } from "react";

/** The read side of any port store, such as `commands.keymap` or `keyboard.pending`. */
export interface ReadableStore<S> {
  get(): S;
  subscribe(listener: (state: S) => void): () => void;
}

/**
 * Reads a port store through `useSyncExternalStore`. The component re-renders only when the
 * store's state, or the selected value, changes by `Object.is`. A selector runs once per state
 * while its identity is stable; an inline selector also runs on each render.
 */
export function useStore<S>(store: ReadableStore<S>): S;
export function useStore<S, T>(store: ReadableStore<S>, selector: (state: S) => T): T;
export function useStore<S, T>(store: ReadableStore<S>, selector?: (state: S) => T): S | T {
  const subscribe = useCallback((notify: () => void) => store.subscribe(() => notify()), [store]);
  const getSnapshot = useMemo(() => {
    if (selector === undefined) return () => store.get();
    let cached: { readonly state: S; readonly value: T } | undefined;
    return () => {
      const state = store.get();
      if (cached === undefined || !Object.is(cached.state, state)) {
        cached = { state, value: selector(state) };
      }
      return cached.value;
    };
  }, [store, selector]);
  return useSyncExternalStore<S | T>(subscribe, getSnapshot, getSnapshot);
}
