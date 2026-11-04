import type { ComponentPropsWithRef, ReactElement } from "react";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useTabsContext } from "./context.js";
import { Tab } from "./tab.js";

export interface TabsListState {}

export interface TabsListProps
  extends Omit<ComponentPropsWithRef<"div">, "className" | "style">, PartProps<TabsListState> {}

/** The `tablist`. Without children it renders a `<Tabs.Tab>` for every item. */
export function List({
  render,
  ref,
  className,
  style,
  children,
  ...props
}: TabsListProps): ReactElement {
  const { label, items } = useTabsContext("<Tabs.List>");
  return useRender({
    render,
    ref,
    props: {
      ...mergeProps({ "data-slot": "tabs-list", role: "tablist", "aria-label": label }, props, {
        children: children ?? items.map((item) => <Tab key={item.value} value={item.value} />),
      }),
      className,
      style,
    },
  });
}
