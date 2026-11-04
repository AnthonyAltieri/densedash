import type { ComponentPropsWithRef, ReactElement } from "react";
import { useKernelFor } from "../context.js";
import { Kbd } from "../kbd.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";

export interface ConfirmPromptState {
  /** The id of the command waiting for confirmation. */
  readonly command: string;
}

export interface ConfirmPromptProps
  extends
    Omit<ComponentPropsWithRef<"div">, "className" | "style" | "children">,
    PartProps<ConfirmPromptState> {}

/**
 * Shows the pending confirmation with its confirm and cancel keys (from the preset, default
 * y and n/Escape). The keys and the two buttons accept or cancel through the command layer.
 */
export function ConfirmPrompt({
  render,
  ref,
  className,
  style,
  ...props
}: ConfirmPromptProps): ReactElement | null {
  const { commands } = useKernelFor("<Keymap.ConfirmPrompt>");
  const pending = useStore(commands.confirm);
  const keymap = useStore(commands.keymap);
  // While a confirmation is pending, the keymap holds exactly its two controls.
  const keys = (command: string) =>
    pending === null ? [] : (keymap.find((entry) => entry.command === command)?.keys ?? []);
  const state: ConfirmPromptState = { command: pending?.command ?? "" };
  const children =
    pending === null ? null : (
      <>
        <span data-slot="keymap-confirm-prompt-text">{pending.prompt}</span>
        <button
          type="button"
          data-slot="keymap-confirm-prompt-confirm"
          onClick={() => commands.accept()}
        >
          {keys("confirm").map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
          <span>Confirm</span>
        </button>
        <button
          type="button"
          data-slot="keymap-confirm-prompt-cancel"
          onClick={() => commands.cancel()}
        >
          {keys("cancel").map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
          <span>Cancel</span>
        </button>
      </>
    );
  const element = useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        { "data-slot": "keymap-confirm-prompt", role: "alert", "aria-label": pending?.label },
        props,
        { children },
      ),
      className,
      style,
    },
  });
  return pending === null ? null : element;
}
