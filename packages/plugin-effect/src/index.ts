import type {
  BasePorts,
  Command,
  Plugin,
  ReporterPort,
  Store,
  StorePort,
  Task,
} from "@densedash/core";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import type * as ManagedRuntime from "effect/ManagedRuntime";
import { Atom, AtomRegistry } from "effect/reactivity";

export interface EffectStore<S> extends Store<S> {
  /** The same writable atom read and written by the store in the plugin registry. */
  readonly atom: Atom.Writable<S>;
}

export interface EffectStorePort extends StorePort {
  create<S>(initial: S): EffectStore<S>;
}

export type EffectCommand<E, R> = Omit<Command, "run"> & {
  readonly run: Effect.Effect<unknown, E, R>;
  /** Optional caller lifetime, in addition to the helper owner's lifetime. */
  readonly signal?: AbortSignal;
};

export interface Fx<R> {
  task<A, E>(effect: Effect.Effect<A, E, R>): Task<A>;
  command<E>(command: EffectCommand<E, R>): Command;
  /** The registry mounting this atom owns its subscription to the store. */
  atom<S>(store: Store<S>): Atom.Atom<S>;
  /** Interrupt outstanding work and reject future runs. Does not dispose the runtime. */
  dispose(): void;
}

/** Standalone helpers: the caller owns dispose(). Prefer plugin.fx inside a kernel. */
export function createFx<R, ER>(runtime: ManagedRuntime.ManagedRuntime<R, ER>): Fx<R> {
  const lifetime = new AbortController();

  function run<A, E>(effect: Effect.Effect<A, E, R>, signal?: AbortSignal): Promise<A> {
    const combined = signal ? AbortSignal.any([lifetime.signal, signal]) : lifetime.signal;
    // Effect evaluates synchronous work before attaching its abort listener.
    if (combined.aborted) return Promise.reject(combined.reason);
    return runtime.runPromise(effect, { signal: combined });
  }

  return {
    task: (effect) => (signal) => run(effect, signal),
    command({ run: effect, signal, ...metadata }) {
      return { ...metadata, run: () => run(Effect.asVoid(effect), signal) };
    },
    atom(store) {
      return Atom.readable((get) => {
        get.addFinalizer(store.subscribe((value) => get.setSelf(value)));
        return store.get();
      });
    },
    dispose: () => lifetime.abort(),
  };
}

export interface EffectPluginOptions<R, ER> {
  readonly runtime: ManagedRuntime.ManagedRuntime<R, ER>;
  /** App-owned when supplied; otherwise the plugin creates and disposes a registry. */
  readonly registry?: AtomRegistry.AtomRegistry;
}

export interface EffectPlugin<R> extends Plugin {
  readonly registry: AtomRegistry.AtomRegistry;
  readonly fx: Fx<R>;
  readonly provides: {
    readonly store: (base: BasePorts) => EffectStorePort;
    readonly reporter: () => ReporterPort;
  };
}

/** Create one plugin instance per kernel. The app retains ownership of its runtime. */
export function effectPlugin<R, ER>({
  runtime,
  registry: suppliedRegistry,
}: EffectPluginOptions<R, ER>): EffectPlugin<R> {
  const registry = suppliedRegistry ?? AtomRegistry.make();
  const fx = createFx(runtime);
  const traces = new AbortController();
  let installed = false;

  const store: EffectStorePort = {
    create<S>(initial: S): EffectStore<S> {
      // writable avoids treating function or Effect values as atom constructors.
      // Keep state through periods without subscribers, as Store has no mount lifecycle.
      const atom = Atom.keepAlive(
        Atom.writable<S, S>(
          () => initial,
          (get, value) => get.setSelf(value),
        ),
      );
      return {
        atom,
        get: () => registry.get(atom),
        set(next) {
          const value =
            typeof next === "function" ? (next as (previous: S) => S)(registry.get(atom)) : next;
          registry.set(atom, value);
        },
        subscribe: (listener) => registry.subscribe(atom, listener),
      };
    },
    batch: Atom.batch,
  };

  const reporter: ReporterPort = {
    error(cause, context) {
      const failure = Cause.isCause(cause) ? cause : Cause.fail(cause);
      runtime.runFork(Effect.annotateLogs(Effect.logError(failure), context));
    },
    warn(message) {
      runtime.runFork(Effect.logWarning(message));
    },
    trace<A>(name: string, run: () => A): A {
      // The port must preserve synchronous returns even while the runtime layer builds.
      // Remember completion until the span fiber is ready, then end it with that outcome.
      let outcome: Effect.Effect<void, unknown> | undefined;
      let resume: ((effect: Effect.Effect<void, unknown>) => void) | undefined;
      const finish = (effect: Effect.Effect<void, unknown>) => {
        outcome = effect;
        resume?.(effect);
      };
      const completion = Effect.callback<void, unknown>((complete) => {
        if (outcome) complete(outcome);
        else resume = complete;
      });
      runtime.runFork(Effect.withSpan(completion, name), { signal: traces.signal });
      try {
        const result = run();
        void Promise.resolve(result).then(
          () => finish(Effect.void),
          (cause: unknown) => finish(Effect.fail(cause)),
        );
        return result;
      } catch (cause) {
        finish(Effect.fail(cause));
        throw cause;
      }
    },
  };

  return {
    name: "@densedash/plugin-effect",
    registry,
    fx,
    provides: { store: () => store, reporter: () => reporter },
    setup(kernel) {
      if (installed) throw new Error("An Effect plugin instance can own only one kernel.");
      installed = true;
      return () => {
        fx.dispose();
        traces.abort();
        if (suppliedRegistry === undefined) {
          // Kernel setup cleanups precede command cleanup, which still writes stores.
          try {
            kernel.commands.dispose();
          } finally {
            registry.dispose();
          }
        }
      };
    },
  };
}
