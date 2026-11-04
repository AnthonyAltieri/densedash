import { defaultProviders } from "./defaults/index.js";
import { resolveKernel } from "./kernel.js";
import type { CheckedKernelOptions, Kernel, KernelOptions, ResolvedPorts } from "./kernel.js";

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
  KeyboardHotkey,
  KeyboardHotkeyChord,
  KeyboardPlatform,
  KeyboardTarget,
  KeyboardHandler,
  KeyboardParseResult,
  KeyboardScopeOptions,
  KeyboardBindingOptions,
  KeyboardBinding,
  PendingKeyboardSequence,
  KeyboardPendingStore,
  ReporterPort,
  Store,
  StorePort,
  Task,
  ChangeDetails,
  Controllable,
} from "./bare.js";

export * from "./commands/index.js";

export const version = "0.0.0";
export * from "./collections/index.js";
export * from "./tree/index.js";

/** Creates an app-scoped kernel; explicit ports override plugins, which override defaults. */
export function createKernel<const Options extends KernelOptions = KernelOptions>(
  options?: Options & CheckedKernelOptions<Options>,
): Kernel<ResolvedPorts<Options>> {
  // The resolver applies the same precedence encoded by ResolvedPorts.
  return resolveKernel({ options: options ?? {}, defaults: defaultProviders }) as Kernel<
    ResolvedPorts<Options>
  >;
}
