import type { ComponentPropsWithRef, ReactElement } from "react";
import type { KeyboardHotkey } from "@densedash/core";
import { useKernelFor } from "./context.js";
import { mergeProps } from "./merge-props.js";
import { useRender } from "./use-render.js";
import type { PartProps } from "./use-render.js";

export interface KbdState {
  /** True when `hotkey` is a multi-step sequence; false for a pre-formatted label. */
  readonly sequence: boolean;
}

export interface KbdProps
  extends Omit<ComponentPropsWithRef<"kbd">, "className" | "style">, PartProps<KbdState> {
  /** Formatted for the current platform. Children, when given, replace the formatted label. */
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
