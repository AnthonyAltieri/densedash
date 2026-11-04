import { Store as TanStackStore, batch } from "@tanstack/store";
import type { PortProviders } from "../kernel.js";
import type { Store, StorePort } from "../ports/store.js";
import { createKeyboardPort } from "./keyboard.js";

function createStorePort(): StorePort {
  return {
    create<S>(initial: S): Store<S> {
      // Box values so TanStack never interprets function-valued initial state as a derivation.
      const state = new TanStackStore({ value: initial });
      return {
        get: () => state.state.value,
        set(next) {
          state.setState(({ value }) => ({
            value: typeof next === "function" ? (next as (previous: S) => S)(value) : next,
          }));
        },
        subscribe(listener) {
          return state.subscribe(({ value }) => listener(value)).unsubscribe;
        },
      };
    },
    batch,
  };
}

export const defaultProviders: PortProviders = {
  store: createStorePort,
  clock: () => ({
    now: () => Date.now(),
    setTimeout(run, ms) {
      const timer = globalThis.setTimeout(run, ms);
      return () => globalThis.clearTimeout(timer);
    },
  }),
  reporter: () => ({
    error: (cause, context) => console.error(cause, context),
    warn: (message) => console.warn(message),
  }),
  keyboard: createKeyboardPort,
};
