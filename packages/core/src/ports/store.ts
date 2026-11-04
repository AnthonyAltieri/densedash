/** A synchronous state container. Function values are set with an updater. */
export interface Store<S> {
  get(): S;
  set(next: S | ((previous: S) => S)): void;
  subscribe(listener: (state: S) => void): () => void;
}

/** Subscriptions run in registration order; batch publishes each store's final state once. */
export interface StorePort {
  create<S>(initial: S): Store<S>;
  batch(run: () => void): void;
}
