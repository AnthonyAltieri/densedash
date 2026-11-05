import { useContext, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { CommandContext } from "@densedash/core";
import { useKernelFor } from "../context.js";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { ScopeContext } from "../scope-context.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { tabId, useTabsContext } from "./context.js";
import type { TabsContextValue } from "./context.js";
import { Tab } from "./tab.js";

export interface TabsListState {}

export interface TabsListProps extends ElementAttributes<HTMLDivElement>, PartProps<TabsListState> {
  /** Defaults to one `<Tabs.Tab>` per item. */
  readonly children?: ReactNode | undefined;
}

/** Selects and focuses the next (1) or previous (-1) enabled tab, wrapping at the ends. */
function step(
  { id, items, value, select }: TabsContextValue,
  list: HTMLElement,
  direction: 1 | -1,
  event: Event | undefined,
): void {
  const enabled = items.filter((item) => item.disabled !== true);
  if (enabled.length === 0) return;
  const current = enabled.findIndex((item) => item.value === value);
  const next =
    current < 0
      ? enabled[direction === 1 ? 0 : enabled.length - 1]!
      : enabled[(current + direction + enabled.length) % enabled.length]!;
  if (!select(next.value, "keyboard", event)) return;
  const tab = list.ownerDocument.getElementById(tabId(id, items.indexOf(next)));
  if (tab !== null && list.contains(tab)) tab.focus();
}

/**
 * Registers `tabs.next` and `tabs.prev` in a scope nested in the tabs' scope and bound to the
 * list element, so the arrow keys move between tabs only while focus is in the list.
 */
function ArrowKeys({ element }: { element: HTMLElement | null }): null {
  const kernel = useKernelFor("<Tabs.List>");
  const context = useTabsContext("<Tabs.List>");
  const parent = useContext(ScopeContext)?.name;
  const id = useId();
  const latest = useRef(context);
  const group = context.label ?? "Tabs";

  useLayoutEffect(() => {
    latest.current = context;
  });

  useLayoutEffect(() => {
    if (parent === undefined || element === null) return;
    const run =
      (direction: 1 | -1) =>
      ({ event }: CommandContext) =>
        step(latest.current, element, direction, event);
    return kernel.commands.register(
      `${parent}/${id}`,
      [
        { id: "tabs.next", label: "Next tab", group, run: run(1) },
        { id: "tabs.prev", label: "Previous tab", group, run: run(-1) },
      ],
      { parent, target: element },
    );
  }, [kernel, parent, element, id, group]);
  return null;
}

/**
 * The `tablist`. Without children it renders a `<Tabs.Tab>` for every item. While focus is in
 * the list, `tabs.next` and `tabs.prev` (ArrowRight and ArrowLeft in the trading preset) select
 * and focus the neighbouring enabled tab.
 */
export function List({
  render,
  ref,
  className,
  style,
  children,
  ...props
}: TabsListProps): ReactElement {
  const { label, items } = useTabsContext("<Tabs.List>");
  const [element, setElement] = useState<HTMLElement | null>(null);
  const rendered = useRender({
    render,
    ref: [ref, setElement],
    props: {
      ...mergeProps({ "data-slot": "tabs-list", role: "tablist", "aria-label": label }, props, {
        children: children ?? items.map((item) => <Tab key={item.value} value={item.value} />),
      }),
      className,
      style,
    },
  });
  return (
    <>
      {rendered}
      <ArrowKeys element={element} />
    </>
  );
}
