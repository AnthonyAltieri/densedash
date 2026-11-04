import type { KeyboardHotkey, KeyboardPort } from "../ports/keyboard.js";
import type { ReporterPort } from "../ports/reporter.js";
import { tradingPreset } from "./trading-preset.js";
import type { KeyOverrides, KeysOptions, Preset, ValidatedKeyOverrides } from "./types.js";

/** parse() supplies canonical identities for aliases as well as validating saved keys. */
export function keyIdentity(hotkey: KeyboardHotkey): string {
  return JSON.stringify(typeof hotkey === "string" ? [hotkey] : hotkey);
}

export function createKeys({
  keyboard,
  reporter,
  options,
}: {
  keyboard: KeyboardPort;
  reporter: ReporterPort;
  options: KeysOptions;
}) {
  const preset = new Map<string, readonly KeyboardHotkey[]>();
  const configured: Preset = options.preset
    ? { confirm: tradingPreset.confirm, cancel: tradingPreset.cancel, ...options.preset }
    : tradingPreset;
  for (const [id, keys] of Object.entries(configured)) {
    const normalized: KeyboardHotkey[] = [];
    for (const key of keys) {
      const parsed = keyboard.parse(key);
      if (!parsed.ok) throw new Error(`Invalid preset key for "${id}": ${parsed.reason}`);
      normalized.push(parsed.hotkey);
    }
    preset.set(id, normalized);
  }
  let overrides = new Map<string, readonly KeyboardHotkey[]>();

  function replace(input: KeyOverrides): ValidatedKeyOverrides {
    const next = new Map<string, readonly KeyboardHotkey[]>();
    for (const [id, value] of Object.entries(input)) {
      const normalized: KeyboardHotkey[] = [];
      let reason: string | undefined;
      if (!Array.isArray(value)) {
        reason = "Expected an array of hotkeys.";
      } else {
        for (const key of value) {
          const parsed = keyboard.parse(key);
          if (!parsed.ok) {
            reason = parsed.reason;
            break;
          }
          normalized.push(parsed.hotkey);
        }
      }
      if (reason !== undefined) {
        reporter.warn(`Invalid key override for "${id}": ${reason} Keeping preset keys.`);
      } else {
        next.set(id, normalized);
      }
    }
    overrides = next;
    return Object.fromEntries(next);
  }

  replace(options.overrides ?? {});
  return {
    get: (id: string): readonly KeyboardHotkey[] => overrides.get(id) ?? preset.get(id) ?? [],
    replace,
  };
}
