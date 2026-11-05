import type { AriaAttributes, HTMLAttributes, Ref } from "react";

/** React's global HTML attributes, without `className` and `style` and the form-only defaults. */
type GlobalAttributeName =
  | "suppressContentEditableWarning"
  | "suppressHydrationWarning"
  | "accessKey"
  | "autoCapitalize"
  | "autoFocus"
  | "contentEditable"
  | "contextMenu"
  | "dir"
  | "draggable"
  | "enterKeyHint"
  | "hidden"
  | "id"
  | "lang"
  | "nonce"
  | "slot"
  | "spellCheck"
  | "tabIndex"
  | "title"
  | "translate"
  | "radioGroup"
  | "role"
  | "about"
  | "content"
  | "datatype"
  | "inlist"
  | "prefix"
  | "property"
  | "rel"
  | "resource"
  | "rev"
  | "typeof"
  | "vocab"
  | "autoCorrect"
  | "autoSave"
  | "color"
  | "itemProp"
  | "itemScope"
  | "itemType"
  | "itemID"
  | "itemRef"
  | "results"
  | "security"
  | "unselectable"
  | "popover"
  | "popoverTargetAction"
  | "popoverTarget"
  | "inert"
  | "inputMode"
  | "is"
  | "exportparts"
  | "part";

// Intersecting with React's own keys drops names an older `@types/react` lacks. Template and
// literal intersections filter keys without instantiating a conditional type per key.
type AttributeName = keyof HTMLAttributes<Element> &
  (keyof AriaAttributes | `on${string}` | GlobalAttributeName);

/**
 * The HTML attributes, ARIA attributes, event handlers and ref a part forwards to its element.
 * `className` and `style` are left out because parts accept functions of their state for them
 * (see `PartProps`), and `children` because each part declares its own. The attributes are
 * picked by name: `Omit<ComponentPropsWithRef<…>, …>` costs every consumer about a thousand
 * type instantiations per distinct part.
 */
export interface ElementAttributes<E extends Element> extends Pick<
  HTMLAttributes<E>,
  AttributeName
> {
  ref?: Ref<E> | undefined;
}
