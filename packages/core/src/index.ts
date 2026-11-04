import { defaultProviders } from "./defaults/index.js";
import { resolveKernel } from "./kernel.js";
import type { Kernel, KernelOptions, ResolvedPorts } from "./kernel.js";

export type {
  BasePorts,
  Kernel,
  KernelOptions,
  Plugin,
  PortProviders,
  Ports,
  ResolvedPorts,
  ClockPort,
  KeyboardPort,
  ReporterPort,
  Store,
  StorePort,
  ChangeDetails,
  Controllable,
} from "./bare.js";

export const version = "0.0.0";
export * from "./collections/index.js";

/** Creates an app-scoped kernel; explicit ports override plugins, which override defaults. */
export function createKernel<const Options extends KernelOptions = KernelOptions>(
  options?: Options,
): Kernel<ResolvedPorts<Options>> {
  // The resolver applies the same precedence encoded by ResolvedPorts.
  return resolveKernel({ options: options ?? {}, defaults: defaultProviders }) as Kernel<
    ResolvedPorts<Options>
  >;
}
