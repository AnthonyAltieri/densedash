import { useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ComponentPropsWithRef, ReactElement } from "react";
import { useKernelFor } from "../context.js";
import { mergeProps } from "../merge-props.js";
import { ScopeContext } from "../scope-context.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";

export interface ScopeState {
  /** Focus is inside the scope, so its commands can run and the legend lists them. */
  readonly active: boolean;
  readonly page: boolean;
}

export interface ScopeProps
  extends Omit<ComponentPropsWithRef<"div">, "className" | "style">, PartProps<ScopeState> {
  /** A unique command scope name; a nested scope takes the enclosing scope as its parent. */
  readonly name: string;
  /**
   * The page's own scope: whenever focus falls back to `<body>` (a click on empty space, a
   * removed element, a swapped view), focus returns here. Render one page scope at a time.
   */
  readonly page?: boolean | undefined;
}

// Read focus from the DOM, as the keymap does: React's focus events miss a focused node that is
// removed and include portals outside the element.
function useFocusWithin(element: HTMLElement | null, setActive: (active: boolean) => void): void {
  useLayoutEffect(() => {
    if (element === null) return;
    const document = element.ownerDocument;
    const view = document.defaultView;
    if (view === null) return;
    const update = () => setActive(element.contains(document.activeElement));
    const onFocusOut = (event: FocusEvent) =>
      setActive(event.relatedTarget instanceof view.Node && element.contains(event.relatedTarget));
    const observer = new view.MutationObserver(update);
    observer.observe(element, { childList: true, subtree: true });
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onFocusOut);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [element, setActive]);
}

function useFocusRestore(element: HTMLElement | null, enabled: boolean): void {
  useLayoutEffect(() => {
    if (!enabled || element === null) return;
    const document = element.ownerDocument;
    const view = document.defaultView;
    if (view === null) return;
    let frame = 0;
    const restore = () => {
      frame = 0;
      const active = document.activeElement;
      if (active === null || active === document.body || active === document.documentElement) {
        element.focus({ preventScroll: true });
      }
    };
    // Focus settles after focusout, so check on the next frame. Removing the focused node
    // moves focus to <body> without a focusout in some browsers, so DOM changes count too.
    const schedule = () => {
      if (frame === 0) frame = view.requestAnimationFrame(restore);
    };
    const observer = new view.MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("focusout", schedule);
    schedule();
    return () => {
      observer.disconnect();
      document.removeEventListener("focusout", schedule);
      if (frame !== 0) view.cancelAnimationFrame(frame);
    };
  }, [element, enabled]);
}

/**
 * Owns a command scope whose keys work while focus is inside the element. Commands registered
 * with `useCommands` below it bind to this element and nest in this scope. The element is
 * focusable (`tabIndex={-1}`) so clicking inside it activates the scope.
 */
export function Scope({
  name,
  page = false,
  render,
  ref,
  className,
  style,
  ...props
}: ScopeProps): ReactElement {
  const kernel = useKernelFor("<Keymap.Scope>");
  const parent = useContext(ScopeContext)?.name;
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    if (element === null) return;
    return kernel.commands.register(name, [], {
      target: element,
      ...(parent === undefined ? {} : { parent }),
    });
  }, [kernel, name, parent, element]);
  useFocusWithin(element, setActive);
  useFocusRestore(element, page);

  const context = useMemo(() => ({ name, element }), [name, element]);
  const state: ScopeState = { active, page };
  const rendered = useRender({
    render,
    ref: [ref, setElement],
    state,
    props: {
      ...mergeProps(
        {
          "data-slot": "keymap-scope",
          "data-scope": name,
          tabIndex: -1,
        },
        props,
      ),
      className,
      style,
    },
  });
  return <ScopeContext value={context}>{rendered}</ScopeContext>;
}
