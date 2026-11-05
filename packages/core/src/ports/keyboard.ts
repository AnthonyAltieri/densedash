import type { Hotkey, HotkeyChord, HotkeyPlatform } from "@tanstack/hotkeys";
import type { Store } from "./store.js";

/** TanStack's checked chord strings and readonly arrays of chord strings. */
export type KeyboardHotkey = Hotkey;
export type KeyboardPlatform = HotkeyPlatform;
export type KeyboardTarget = HTMLElement | Document | Window;
export type KeyboardHandler = (event: KeyboardEvent) => void;

export type KeyboardParseResult =
  | { readonly ok: true; readonly hotkey: KeyboardHotkey }
  | { readonly ok: false; readonly reason: string };

export interface KeyboardScopeOptions {
  readonly parent?: string;
  readonly exclusive?: boolean | { readonly allow: readonly string[] };
}

export interface KeyboardBindingOptions {
  /** Defaults to the always-active "global" scope. */
  readonly scope?: string;
  /** Defaults to document. Element targets require focus within the element. */
  readonly target?: KeyboardTarget;
  /** Defaults to "auto": skip typing keys in controls, but allow Mod shortcuts. */
  readonly ignoreInputs?: boolean | "auto";
  readonly enabled?: boolean;
  /** Maximum milliseconds between sequence steps. Defaults to 1,000. */
  readonly timeout?: number;
}

export interface KeyboardBinding {
  /** Merge options and optionally replace the handler. A new target resets progress. */
  update(options: KeyboardBindingOptions & { readonly handler?: KeyboardHandler }): void;
  /** Idempotent. Updates after disposal do nothing. */
  dispose(): void;
}

export interface PendingKeyboardSequence {
  readonly id: string;
  readonly hotkey: readonly KeyboardHotkeyChord[];
  readonly matchedStepCount: number;
  readonly scope: string;
  readonly target: KeyboardTarget;
}

export type KeyboardHotkeyChord = HotkeyChord;
/** The read side of Store; consumers cannot write sequence progress. */
export type KeyboardPendingStore = Pick<
  Store<readonly PendingKeyboardSequence[]>,
  "get" | "subscribe"
>;

export interface KeyboardPort {
  readonly platform: KeyboardPlatform;
  /** Validate saved strings or arrays. Malformed input returns a reason, never throws. */
  parse(input: unknown): KeyboardParseResult;
  /** A label: `⇧J`, `⌘K` on macOS; `Shift+J`, `Ctrl+K` elsewhere; `g r` for a sequence. */
  format(hotkey: KeyboardHotkey): string;
  /** Descendants beat ancestors; otherwise the latest activation wins. Release is idempotent. */
  activateScope(scope: string, options?: KeyboardScopeOptions): () => void;
  bind(
    hotkey: KeyboardHotkey,
    handler: KeyboardHandler,
    options?: KeyboardBindingOptions,
  ): KeyboardBinding;
  readonly pending: KeyboardPendingStore;
  /** Releases all bindings, scopes, subscriptions, timers and DOM listeners once. */
  dispose(): void;
}
