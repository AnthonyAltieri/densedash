import type { HTMLAttributes } from "react";
import type { DataAttributes } from "./merge-props.js";

/** The event members a neutral handler may use; DOM and React events both provide them. */
export interface NeutralEvent {
  readonly target: EventTarget | null;
  readonly currentTarget: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface NeutralModifiers {
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

export interface NeutralKeyboardEvent extends NeutralEvent, NeutralModifiers {
  readonly key: string;
  readonly code: string;
  readonly repeat: boolean;
}

export interface NeutralPointerEvent extends NeutralEvent, NeutralModifiers {
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
}

export interface NeutralFocusEvent extends NeutralEvent {
  readonly relatedTarget: EventTarget | null;
}

/**
 * Handlers of framework-neutral props returned by core prop getters (such as the tree's
 * `getRootProps()`).
 *
 * - Attributes use DOM spelling: `id`, `role`, `tabindex`, `class`, `for`, `aria-*`, `data-*`.
 * - Handlers use camelCase `on<Event>` names and receive the neutral event types below. The
 *   React adapter passes React's event, which provides them with React's propagation semantics
 *   (`onFocus` and `onBlur` bubble like `focusin` and `focusout`).
 * - `undefined` values are omitted; other values pass through unchanged.
 */
// Method syntax keeps handler parameters bivariant, so getters typed with DOM events fit.
export interface NeutralHandlers {
  onKeyDown?(event: NeutralKeyboardEvent): void;
  onKeyUp?(event: NeutralKeyboardEvent): void;
  onFocus?(event: NeutralFocusEvent): void;
  onBlur?(event: NeutralFocusEvent): void;
  onClick?(event: NeutralPointerEvent): void;
  onDoubleClick?(event: NeutralPointerEvent): void;
  onPointerDown?(event: NeutralPointerEvent): void;
  onPointerMove?(event: NeutralPointerEvent): void;
  onPointerUp?(event: NeutralPointerEvent): void;
}

/** Prop-getter output: an interface such as `TreeRootProps`, or a plain object literal. */
export type NeutralProps =
  | (object & NeutralHandlers)
  | (Readonly<Record<string, unknown>> & NeutralHandlers);

/** React props ready to spread or pass to `mergeProps`. */
export interface NormalizedProps extends HTMLAttributes<HTMLElement>, DataAttributes {}

const reactNames: Readonly<Record<string, string>> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  contenteditable: "contentEditable",
  spellcheck: "spellCheck",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  accesskey: "accessKey",
  colspan: "colSpan",
  rowspan: "rowSpan",
  maxlength: "maxLength",
  minlength: "minLength",
};

/** Converts neutral prop-getter output into React props; handler names already match React's. */
export function normalizeProps(props: NeutralProps): NormalizedProps {
  const normalized: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (value !== undefined) normalized[reactNames[name] ?? name] = value;
  }
  return normalized as NormalizedProps;
}
