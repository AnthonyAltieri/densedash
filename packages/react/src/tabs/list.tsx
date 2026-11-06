import { useContext, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Command, CommandContext } from "@densedash/core";
import { useKernelFor } from "../context.js";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { ScopeContext } from "../scope-context.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { TabsListContext, tabId, useTabsContext } from "./context.js";
import type { TabsContextValue } from "./context.js";
import { Tab } from "./tab.js";

export type TabsOrientation = "horizontal" | "vertical";

export interface TabsListState {
  readonly orientation: TabsOrientation;
}

export interface TabsListProps extends ElementAttributes<HTMLDivElement>, PartProps<TabsListState> {
  /** Defaults to one `<Tabs.Tab>` per item. */
  readonly children?: ReactNode | undefined;
  /** Lays the tabs out in a row or a column and sets `aria-orientation`. Defaults to a row. */
  readonly orientation?: TabsOrientation | undefined;
}

/** The first or last enabled tab, or the enabled tab after (1) or before (-1) the focused one. */
type Move = "first" | "last" | 1 | -1;

/**
 * Selects and focuses the tab `move` names, wrapping at the ends. It steps from focus rather than
 * the value, so a controlled parent that keeps its value or a disabled selected tab cannot trap
 * focus.
 */
function step(
  { items, value, select }: TabsContextValue,
  prefix: string,
  list: HTMLElement,
  move: Move,
  event: Event | undefined,
): void {
  const enabled = items.filter((item) => item.disabled !== true);
  if (enabled.length === 0) return;
  let next = move === "last" ? enabled[enabled.length - 1]! : enabled[0]!;
  if (move === 1 || move === -1) {
    const active = list.ownerDocument.activeElement;
    const focused =
      active !== null && list.contains(active)
        ? items.find((item, index) => tabId(prefix, index) === active.id)?.value
        : undefined;
    const from = focused ?? value;
    const current = enabled.findIndex((item) => item.value === from);
    next =
      current < 0
        ? enabled[move === 1 ? 0 : enabled.length - 1]!
        : enabled[(current + move + enabled.length) % enabled.length]!;
  }
  if (!select(next.value, "keyboard", event)) return;
  const tab = list.ownerDocument.getElementById(tabId(prefix, items.indexOf(next)));
  if (tab !== null && list.contains(tab)) tab.focus();
}

/** Right-to-left lists run backwards along the row, so the horizontal arrows swap there. */
function rightToLeft(element: HTMLElement): boolean {
  return element.ownerDocument.defaultView?.getComputedStyle(element).direction === "rtl";
}

function reverse(move: 1 | -1): 1 | -1 {
  return move === 1 ? -1 : 1;
}

/**
 * Registers the list's movement commands in a scope nested in the tabs' scope and bound to the
 * list element, so they answer only while focus is in the list: `tabs.first` and `tabs.last`,
 * plus `tabs.next` and `tabs.prev` in a row or `tabs.down` and `tabs.up` in a column.
 */
function ListKeys({
  element,
  prefix,
  orientation,
}: {
  element: HTMLElement | null;
  prefix: string;
  orientation: TabsOrientation;
}): null {
  const kernel = useKernelFor("<Tabs.List>");
  const context = useTabsContext("<Tabs.List>");
  const parent = useContext(ScopeContext)?.name;
  const id = useId();
  const latest = useRef(context);

  useLayoutEffect(() => {
    latest.current = context;
  });

  useLayoutEffect(() => {
    if (parent === undefined || element === null) return;
    const run =
      (move: Move) =>
      ({ event }: CommandContext) =>
        step(latest.current, prefix, element, move, event);
    // Direction is read when the key is pressed, so a `dir` change needs no re-registration.
    const along =
      (move: 1 | -1) =>
      ({ event }: CommandContext) =>
        step(latest.current, prefix, element, rightToLeft(element) ? reverse(move) : move, event);
    const stepGroup = { group: "tabs.step", groupLabel: "step" } as const;
    const jumpGroup = { group: "tabs.jump", groupLabel: "jump", legend: "secondary" } as const;
    const commands: Command[] =
      orientation === "vertical"
        ? [
            { id: "tabs.down", label: "Next tab", ...stepGroup, run: run(1) },
            { id: "tabs.up", label: "Previous tab", ...stepGroup, run: run(-1) },
          ]
        : [
            { id: "tabs.next", label: "Next tab", ...stepGroup, run: along(1) },
            { id: "tabs.prev", label: "Previous tab", ...stepGroup, run: along(-1) },
          ];
    return kernel.commands.register(
      `${parent}/${id}`,
      [
        ...commands,
        { id: "tabs.first", label: "First tab", ...jumpGroup, run: run("first") },
        { id: "tabs.last", label: "Last tab", ...jumpGroup, run: run("last") },
      ],
      { parent, target: element },
    );
  }, [kernel, parent, element, prefix, orientation, id]);
  return null;
}

/**
 * The `tablist`. Without children it renders a `<Tabs.Tab>` for every item. While focus is in
 * the list, `tabs.first` and `tabs.last` (Home and End in the trading preset) select and focus
 * the first and last enabled tab. In a row, `tabs.next` and `tabs.prev` (ArrowRight and
 * ArrowLeft) select the enabled tab to the right and to the left, which is the previous and the
 * next tab in right-to-left text. In a column, `tabs.down` and `tabs.up` (ArrowDown and ArrowUp)
 * select the next and the previous enabled tab.
 *
 * A root can hold several lists, each a view of the same tabs. The first mounted list keeps the
 * plain tab ids that panels are labelled by; later lists prefix theirs with their own id.
 */
export function List({
  orientation = "horizontal",
  render,
  ref,
  className,
  style,
  children,
  ...props
}: TabsListProps): ReactElement {
  const { id, label, items, lists, registerList } = useTabsContext("<Tabs.List>");
  const list = useId();
  const [element, setElement] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => registerList(list), [registerList, list]);
  // Before the lists register, every list renders the plain ids; the first one keeps them.
  const prefix = lists[0] === undefined || lists[0] === list ? id : `${id}-list${list}`;
  const state: TabsListState = { orientation };
  const rendered = useRender({
    render,
    ref: [ref, setElement],
    state,
    props: {
      ...mergeProps(
        {
          "data-slot": "tabs-list",
          role: "tablist",
          "aria-label": label,
          "aria-orientation": orientation,
        },
        props,
        {
          children: children ?? items.map((item) => <Tab key={item.value} value={item.value} />),
        },
      ),
      className,
      style,
    },
  });
  return (
    <TabsListContext value={prefix}>
      {rendered}
      <ListKeys element={element} prefix={prefix} orientation={orientation} />
    </TabsListContext>
  );
}
