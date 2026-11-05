import type { ReactElement, ReactNode } from "react";
import type { KeyboardHotkey } from "@densedash/core";
import { useKernelFor } from "./context.js";
import type { ElementAttributes } from "./element-attributes.js";
import { mergeProps } from "./merge-props.js";
import { useRender } from "./use-render.js";
import type { PartProps } from "./use-render.js";

export interface KbdState {
  /** True when `hotkey` is a multi-step sequence; false for a pre-formatted label. */
  readonly sequence: boolean;
}

export interface KbdProps extends ElementAttributes<HTMLElement>, PartProps<KbdState> {
  readonly children?: ReactNode | undefined;
  /**
   * Formatted by the keyboard port: `⇧J` and `⌘K` on macOS, `Shift+J` and `Ctrl+K` elsewhere,
   * `g r` for a sequence. Children, when given, replace the formatted label.
   */
  readonly hotkey?: KeyboardHotkey | undefined;
}

/** A key label: `<kbd data-slot="kbd">`. */
export function Kbd({ hotkey, render, ref, className, style, ...props }: KbdProps): ReactElement {
  const { keyboard } = useKernelFor("<Kbd>").ports;
  const state: KbdState = { sequence: typeof hotkey === "object" && hotkey.length > 1 };
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "kbd",
    props: {
      ...mergeProps<"kbd">(
        {
          "data-slot": "kbd",
          children: hotkey === undefined ? undefined : keyboard.format(hotkey),
        },
        props,
      ),
      className,
      style,
    },
  });
}

export interface KbdRangeState {}

export interface KbdRangeProps
  extends ElementAttributes<HTMLSpanElement>, PartProps<KbdRangeState> {
  /** The first key of the range, such as `"1"`. */
  readonly from: KeyboardHotkey;
  /** The last key of the range, such as `"3"`. */
  readonly to: KeyboardHotkey;
}

/** Two formatted labels as keycaps joined by an en dash, `1–3`. Shared with the footer legend. */
export function rangeLabels(from: string, to: string): ReactNode {
  return (
    <>
      <Kbd>{from}</Kbd>–<Kbd>{to}</Kbd>
    </>
  );
}

/** A run of keys, such as `1–3` for three number keys: `<span data-slot="kbd-range">`. */
export function KbdRange({
  from,
  to,
  render,
  ref,
  className,
  style,
  ...props
}: KbdRangeProps): ReactElement {
  const { keyboard } = useKernelFor("<KbdRange>").ports;
  const state: KbdRangeState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "span",
    props: {
      ...mergeProps<"span">({ "data-slot": "kbd-range" }, props, {
        children: rangeLabels(keyboard.format(from), keyboard.format(to)),
      }),
      className,
      style,
    },
  });
}
