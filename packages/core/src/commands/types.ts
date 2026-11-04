import type { KeyboardBindingOptions, KeyboardHotkey } from "../ports/keyboard.js";
import type { Store } from "../ports/store.js";
import type { tradingPreset } from "./trading-preset.js";

/** Augment through either public entry with `commands: { open: unknown; ... }`. */
export interface Register {}

/** Commands that densedash parts register themselves, so apps can rebind them by id. */
type PartCommandId = Extract<keyof typeof tradingPreset, `tree.${string}` | `tabs.${string}`>;

export type CommandId =
  | PartCommandId
  | (Register extends { commands: infer Commands } ? Extract<keyof Commands, string> : string);
export type KeyOverrideId = Register extends { commands: infer Commands }
  ? Extract<keyof Commands, string> | PartCommandId | "confirm" | "cancel"
  : keyof typeof tradingPreset;

export interface CommandContext {
  readonly event?: KeyboardEvent;
}

export interface Command {
  readonly id: CommandId;
  readonly label: string;
  readonly group?: string;
  readonly enabled?: () => boolean;
  readonly confirm?: { readonly prompt: string };
  readonly hidden?: boolean;
  run(context: CommandContext): void | PromiseLike<void>;
}

export type Preset = Readonly<Record<string, readonly KeyboardHotkey[]>>;
/** Values may come from storage; each command's complete key list is validated atomically. */
export type KeyOverrides = Readonly<Partial<Record<KeyOverrideId, unknown>>>;
export type ValidatedKeyOverrides = Readonly<
  Partial<Record<KeyOverrideId, readonly KeyboardHotkey[]>>
>;

export interface KeysOptions {
  readonly preset?: Preset;
  readonly overrides?: KeyOverrides;
  readonly onChange?: (overrides: ValidatedKeyOverrides) => void;
}

export interface CommandScopeOptions extends Omit<KeyboardBindingOptions, "scope" | "enabled"> {
  readonly parent?: string;
  /** Rebind just the supplied commands in an exclusive scope. */
  readonly only?: boolean;
}

export interface KeymapEntry {
  readonly command: string;
  readonly label: string;
  readonly group?: string;
  readonly scope: string;
  readonly keys: readonly string[];
}

export interface PendingConfirm {
  readonly command: string;
  readonly label: string;
  readonly prompt: string;
  readonly scope: string;
}

export interface Commands {
  /** A scope name has one owner. Unregister before reusing it. */
  register(scope: string, commands: readonly Command[], options?: CommandScopeOptions): () => void;
  /** Optional scope selects a specific owner; otherwise use descendant/latest precedence. */
  invoke(id: CommandId, context?: CommandContext & { readonly scope?: string }): void;
  readonly keymap: Pick<Store<readonly KeymapEntry[]>, "get" | "subscribe">;
  readonly confirm: Pick<Store<PendingConfirm | null>, "get" | "subscribe">;
  /**
   * The keys bound to a command id (its override, else its preset keys), whether or not a
   * scope has focus. `keymap` republishes after `setOverrides`, so subscribe to it to follow.
   */
  keys(id: CommandId): readonly KeyboardHotkey[];
  accept(): void;
  cancel(): void;
  /** Replaces all overrides, rebinds live scopes, then notifies onChange with validated keys. */
  setOverrides(overrides: KeyOverrides): void;
  dispose(): void;
}
