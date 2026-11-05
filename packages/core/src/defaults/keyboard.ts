import {
  ALL_KEYS,
  HotkeyManager,
  detectPlatform,
  formatForDisplay,
  normalizeHotkey,
  parseHotkey,
  toHotkeyRegistrationView,
  validateHotkey,
} from "@tanstack/hotkeys";
import type { HotkeyRegistrationHandle } from "@tanstack/hotkeys";
import type {
  KeyboardBindingOptions,
  KeyboardHandler,
  KeyboardHotkey,
  KeyboardHotkeyChord,
  KeyboardPlatform,
  KeyboardPort,
  PendingKeyboardSequence,
} from "../ports/keyboard.js";

/**
 * Hotkeys' display parts, joined as compact keycap labels: glyphs with no separator on macOS
 * (`⇧J`, `⌘K`) and text joined by `+` elsewhere (`Shift+J`, `Ctrl+K`). A letter pressed on its
 * own reads in lower case (`j`, and `g r` for a sequence), as it is typed.
 */
function formatChord(chord: KeyboardHotkeyChord, platform: KeyboardPlatform): string {
  const parts = formatForDisplay(chord, { platform, parts: true });
  const [only] = parts;
  if (parts.length === 1 && only !== undefined && /^[A-Z]$/.test(only)) return only.toLowerCase();
  return parts.join(platform === "mac" ? "" : "+");
}

export function createKeyboardPort(): KeyboardPort {
  // 0.24.0 exposes only a singleton factory and marks its zero-argument constructor
  // private in types. The shipped constructor is independent of that singleton.
  // Keep this pinned interop here: each kernel must own its scopes and listeners.
  const manager = Reflect.construct(HotkeyManager, []) as HotkeyManager;
  // The port exposes shared options and an event-only callback. Erase upstream's
  // per-chord conditional inference here rather than distributing its key union.
  const register = manager.register as unknown as (
    hotkey: KeyboardHotkey,
    handler: KeyboardHandler,
    options: KeyboardBindingOptions & { conflictBehavior: "allow" },
  ) => HotkeyRegistrationHandle<KeyboardBindingOptions>;
  const platform = detectPlatform();
  const releases = new Set<() => void>();
  let disposed = false;
  let registrations = manager.registrations.state;
  let pending: readonly PendingKeyboardSequence[] = [];

  function readPending(): readonly PendingKeyboardSequence[] {
    if (registrations === manager.registrations.state) return pending;
    registrations = manager.registrations.state;
    const sequences: PendingKeyboardSequence[] = [];
    for (const registration of registrations.values()) {
      const view = toHotkeyRegistrationView(registration);
      if (view.kind === "sequence" && view.matchedStepCount > 0) {
        sequences.push({
          id: view.id,
          hotkey: view.hotkey,
          matchedStepCount: view.matchedStepCount,
          scope: view.options.scope ?? "global",
          target: view.target,
        });
      }
    }
    pending = sequences;
    return pending;
  }

  function requireLive(): void {
    if (disposed) throw new Error("Keyboard port has been disposed.");
  }

  function own(cleanup: () => void): () => void {
    const release = () => {
      if (!releases.delete(release)) return;
      cleanup();
    };
    releases.add(release);
    return release;
  }

  return {
    platform,
    parse(input) {
      if (
        typeof input !== "string" &&
        !(
          Array.isArray(input) &&
          Array.from(input).every((step: unknown) => typeof step === "string")
        )
      ) {
        return { ok: false, reason: "Expected a hotkey string or an array of hotkey strings." };
      }
      try {
        const steps: readonly string[] = typeof input === "string" ? [input] : input;
        const normalized: KeyboardHotkeyChord[] = [];
        const knownKeys: ReadonlySet<string> = ALL_KEYS;
        for (const step of steps) {
          const validation = validateHotkey(step);
          if (!validation.valid) return { ok: false, reason: validation.errors.join("; ") };
          const parsed = parseHotkey(step, platform);
          // Upstream validates key-name shape, so even "Bogus" passes. Use its
          // canonical logical-key set before trusting its normalized return type.
          if (parsed.key !== undefined && !knownKeys.has(parsed.key)) {
            return { ok: false, reason: `Unknown key: '${parsed.key}'.` };
          }
          normalized.push(normalizeHotkey(step, platform));
        }
        const first = normalized[0];
        if (first === undefined) return { ok: false, reason: "Sequence cannot be empty." };
        return { ok: true, hotkey: normalized.length === 1 ? first : normalized };
      } catch (cause) {
        return { ok: false, reason: cause instanceof Error ? cause.message : "Invalid hotkey." };
      }
    },
    format: (hotkey) =>
      typeof hotkey === "string"
        ? formatChord(hotkey, platform)
        : hotkey.map((step) => formatChord(step, platform)).join(" "),
    activateScope(scope, options) {
      requireLive();
      return own(manager.activateScope(scope, options));
    },
    bind(hotkey, handler, options = {}) {
      requireLive();
      let currentOptions: KeyboardBindingOptions = options;
      let currentHandler = handler;
      let handle = register.call(manager, hotkey, handler, {
        ...options,
        conflictBehavior: "allow",
      });
      let active = true;
      const dispose = own(() => {
        active = false;
        handle.unregister();
      });
      return {
        update({ handler: nextHandler, ...nextOptions }) {
          if (!active) return;
          const previousTarget = currentOptions.target;
          currentOptions = { ...currentOptions, ...nextOptions };
          currentHandler = nextHandler ?? currentHandler;
          // Hotkeys setOptions does not move a registration to a different target.
          if (currentOptions.target !== previousTarget) {
            handle.unregister();
            handle = register.call(manager, hotkey, currentHandler, {
              ...currentOptions,
              conflictBehavior: "allow",
            });
          } else {
            handle.callback = currentHandler;
            handle.setOptions(nextOptions);
          }
        },
        dispose,
      };
    },
    pending: {
      get: readPending,
      subscribe(listener) {
        if (disposed) return () => {};
        const subscription = manager.registrations.subscribe(() => listener(readPending()));
        return own(subscription.unsubscribe);
      },
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const release of releases) release();
      manager.destroy();
      readPending();
    },
  };
}
