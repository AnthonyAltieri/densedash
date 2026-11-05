import type { ComponentPropsWithRef, ReactElement } from "react";
import type {
  KeyboardHotkey,
  KeyboardHotkeyChord,
  KeyboardPort,
  KeymapEntry,
  PendingKeyboardSequence,
} from "@densedash/core";
import { useKernelFor } from "../context.js";
import { Kbd } from "../kbd.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";

export interface ChordHintState {
  /** The formatted keys pressed so far. */
  readonly prefix: string;
}

export interface ChordHintProps
  extends
    Omit<ComponentPropsWithRef<"div">, "className" | "style" | "children">,
    PartProps<ChordHintState> {}

interface ChordOption {
  readonly id: string;
  readonly command: string;
  readonly label: string;
  readonly remaining: readonly KeyboardHotkeyChord[];
}

/** Sequences with the most matched steps, joined to their keymap entries by formatted key. */
function chordHint(
  pending: readonly PendingKeyboardSequence[],
  keymap: readonly KeymapEntry[],
  keyboard: KeyboardPort,
): {
  readonly prefix: string;
  readonly keys: KeyboardHotkey;
  readonly options: readonly ChordOption[];
} | null {
  const matched = Math.max(0, ...pending.map((sequence) => sequence.matchedStepCount));
  if (matched === 0) return null;
  let prefix: string | undefined;
  let keys: KeyboardHotkey | undefined;
  const options: ChordOption[] = [];
  for (const sequence of pending) {
    if (sequence.matchedStepCount !== matched) continue;
    const formatted = keyboard.format(sequence.hotkey);
    const entry = keymap.find(
      (candidate) =>
        candidate.enabled &&
        candidate.scope === sequence.scope &&
        candidate.keys.includes(formatted),
    );
    // Hidden and disabled commands stay out of the hint.
    if (entry === undefined) continue;
    const steps = sequence.hotkey.slice(0, matched);
    const stepPrefix = keyboard.format(steps);
    keys ??= steps;
    prefix ??= stepPrefix;
    if (stepPrefix !== prefix) continue;
    options.push({
      id: sequence.id,
      command: entry.command,
      label: entry.label,
      remaining: sequence.hotkey.slice(matched),
    });
  }
  return prefix === undefined || keys === undefined ? null : { prefix, keys, options };
}

/** While a key sequence is in progress, shows the keys pressed and the keys that can follow. */
export function ChordHint({
  render,
  ref,
  className,
  style,
  ...props
}: ChordHintProps): ReactElement | null {
  const kernel = useKernelFor("<Keymap.ChordHint>");
  const { keyboard } = kernel.ports;
  const pending = useStore(keyboard.pending);
  const keymap = useStore(kernel.commands.keymap);
  const hint = chordHint(pending, keymap, keyboard);
  const state: ChordHintState = { prefix: hint?.prefix ?? "" };
  const children =
    hint === null ? null : (
      <>
        <div data-slot="keymap-chord-hint-prefix">
          <Kbd hotkey={hint.keys} />
        </div>
        {hint.options.map((option) => (
          <div key={option.id} data-slot="keymap-chord-hint-option" data-command={option.command}>
            <span data-slot="keymap-chord-hint-keys">
              {option.remaining.map((step, index) => (
                <Kbd key={index} hotkey={step} />
              ))}
            </span>
            <span data-slot="keymap-chord-hint-label">{option.label}</span>
          </div>
        ))}
      </>
    );
  // useRender is a hook, so it runs before the empty case returns.
  const element = useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        { "data-slot": "keymap-chord-hint", role: "status", "aria-label": "Next keys" },
        props,
        { children },
      ),
      className,
      style,
    },
  });
  return hint === null ? null : element;
}
