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
} from "./kernel.js";
export type { ClockPort } from "./ports/clock.js";
export type {
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
} from "./ports/keyboard.js";
export type { ReporterPort } from "./ports/reporter.js";
export type { Store, StorePort } from "./ports/store.js";
export type { ChangeDetails, Controllable } from "./controllable.js";

/** No defaults: every port must be supplied by plugins or explicit ports. */
export function createKernel<const Options extends KernelOptions = KernelOptions>(
  options?: Options,
): Kernel<ResolvedPorts<Options>> {
  // The resolver applies the same precedence encoded by ResolvedPorts.
  return resolveKernel({ options: options ?? {} }) as Kernel<ResolvedPorts<Options>>;
}
