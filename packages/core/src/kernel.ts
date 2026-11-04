import { createCommands } from "./commands/index.js";
import type { Commands, KeyOverrideId, KeysOptions } from "./commands/types.js";
import type { ClockPort } from "./ports/clock.js";
import type { KeyboardPort } from "./ports/keyboard.js";
import type { ReporterPort } from "./ports/reporter.js";
import type { StorePort } from "./ports/store.js";

export interface BasePorts {
  readonly clock: ClockPort;
  readonly reporter: ReporterPort;
}

export interface Ports extends BasePorts {
  readonly store: StorePort;
  readonly keyboard: KeyboardPort;
}

/** Base factories have no dependencies; leaf factories receive only resolved base ports. */
export interface PortProviders {
  clock?: () => ClockPort;
  reporter?: () => ReporterPort;
  store?: (base: BasePorts) => StorePort;
  keyboard?: (base: BasePorts) => KeyboardPort;
}

export interface Plugin {
  readonly name: string;
  readonly provides?: PortProviders;
  setup?(kernel: Kernel): void | (() => void);
}

export interface Kernel<P = Ports> {
  readonly ports: P;
  readonly commands: Commands;
  /** Runs setup cleanups in reverse order, then disposes commands and the keyboard port, once. */
  dispose(): void;
}

export interface KernelOptions {
  plugins?: readonly Plugin[];
  ports?: Partial<Ports>;
  keys?: KeysOptions;
}

/** Reject extra override ids even through the generic port-inference entrypoints. */
export type CheckedKernelOptions<Options extends KernelOptions> = Options extends {
  keys: { overrides: infer Overrides };
}
  ? Options & { keys: { overrides: Record<Exclude<keyof Overrides, KeyOverrideId>, never> } }
  : Options;

type PluginPort<Installed, Key extends keyof Ports> = Installed extends {
  provides: Record<Key, (...args: never[]) => infer Value extends Ports[Key]>;
}
  ? Value
  : never;

// A runtime-sized array might be empty. Distribute tuple alternatives so an
// optional plugin cannot promise a port extension that is absent at runtime.
type InstalledPort<Installed, Key extends keyof Ports> = Installed extends readonly Plugin[]
  ? number extends Installed["length"]
    ? Ports[Key]
    : [PluginPort<Installed[number], Key>] extends [never]
      ? Ports[Key]
      : PluginPort<Installed[number], Key>
  : Ports[Key];

type ConfiguredPort<
  Options extends KernelOptions,
  Key extends keyof Ports,
> = "plugins" extends keyof Options ? InstalledPort<Options["plugins"], Key> : Ports[Key];

/** Shallow inference preserves required overrides and accounts for optional ones. */
export type ResolvedPorts<Options extends KernelOptions> = {
  readonly [Key in keyof Ports]: Options extends {
    ports: Record<Key, infer Value extends Ports[Key]>;
  }
    ? Value
    : Key extends keyof NonNullable<Options["ports"]>
      ? NonNullable<NonNullable<Options["ports"]>[Key]> | ConfiguredPort<Options, Key>
      : ConfiguredPort<Options, Key>;
};

const portNames = ["clock", "reporter", "store", "keyboard"] as const;

function requirePort<T>(name: keyof Ports, value: T | undefined): T {
  if (value === undefined) {
    throw new Error(`Missing port "${name}". Supply it through a plugin or explicit ports.`);
  }
  return value;
}

/** Internal composition root shared by main and bare; imports no implementations. */
export function resolveKernel({
  options = {},
  defaults = {},
}: {
  options?: KernelOptions;
  defaults?: PortProviders;
} = {}): Kernel {
  const plugins = options.plugins ?? [];
  const overrides: Partial<Ports> = options.ports ?? {};
  const providers: PortProviders = {};
  const owners: Partial<Record<keyof Ports, string>> = {};

  // Validate all conflicts and missing ports before invoking any provider.
  for (const plugin of plugins) {
    for (const name of portNames) {
      if (plugin.provides?.[name] === undefined) continue;
      const owner = owners[name];
      if (owner !== undefined) {
        throw new Error(
          `Port "${name}" is provided by both plugins "${owner}" and "${plugin.name}".`,
        );
      }
      owners[name] = plugin.name;
    }
    Object.assign(providers, plugin.provides);
  }
  for (const name of portNames) {
    requirePort(name, overrides[name] ?? providers[name] ?? defaults[name]);
  }

  const base: BasePorts = {
    clock: requirePort("clock", overrides.clock ?? (providers.clock ?? defaults.clock)?.()),
    reporter: requirePort(
      "reporter",
      overrides.reporter ?? (providers.reporter ?? defaults.reporter)?.(),
    ),
  };
  const ports: Ports = {
    ...base,
    store: requirePort("store", overrides.store ?? (providers.store ?? defaults.store)?.(base)),
    keyboard: requirePort(
      "keyboard",
      overrides.keyboard ?? (providers.keyboard ?? defaults.keyboard)?.(base),
    ),
  };
  const cleanups: (() => void)[] = [() => ports.keyboard.dispose()];
  let commands: Commands;
  try {
    commands = createCommands({
      ports,
      ...(options.keys === undefined ? {} : { keys: options.keys }),
    });
  } catch (cause) {
    try {
      ports.keyboard.dispose();
    } catch (cleanupCause) {
      throw new AggregateError([cause, cleanupCause], "Command setup and keyboard cleanup failed.");
    }
    throw cause;
  }
  cleanups.push(() => commands.dispose());
  let disposed = false;
  const kernel: Kernel = {
    ports,
    commands,
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      for (const cleanup of cleanups.reverse()) {
        try {
          cleanup();
        } catch (cause) {
          errors.push(cause);
        }
      }
      cleanups.length = 0;
      if (errors.length > 0) {
        throw new AggregateError(errors, "Kernel cleanup failed.");
      }
    },
  };

  try {
    for (const plugin of plugins) {
      if (disposed) break;
      const cleanup = plugin.setup?.(kernel);
      if (cleanup) {
        // setup can itself dispose the kernel before returning its cleanup.
        if (disposed) cleanup();
        else cleanups.push(cleanup);
      }
    }
  } catch (cause) {
    try {
      kernel.dispose();
    } catch (cleanupCause) {
      throw new AggregateError([cause, cleanupCause], "Kernel setup and cleanup failed.");
    }
    throw cause;
  }

  return kernel;
}
