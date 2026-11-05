import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { panelId, tabId, useTabsContext } from "./context.js";

export interface TabsPanelState {
  readonly selected: boolean;
  readonly value: string;
}

export interface TabsPanelProps
  extends ElementAttributes<HTMLDivElement>, PartProps<TabsPanelState> {
  readonly children?: ReactNode | undefined;
  /** The item value whose tab shows this panel. */
  readonly value: string;
  /** Keeps the children mounted while the panel is hidden. */
  readonly keepMounted?: boolean | undefined;
}

/** The `tabpanel` for one item; hidden, with its children unmounted, unless it is selected. */
export function Panel({
  value,
  keepMounted = false,
  render,
  ref,
  className,
  style,
  children,
  ...props
}: TabsPanelProps): ReactElement {
  const { id, items, value: selected } = useTabsContext("<Tabs.Panel>");
  const index = items.findIndex((item) => item.value === value);
  const state: TabsPanelState = { selected: value === selected, value };
  return useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        {
          "data-slot": "tabs-panel",
          role: "tabpanel",
          id: panelId(id, index),
          "aria-labelledby": tabId(id, index),
          tabIndex: 0,
          hidden: !state.selected,
        },
        props,
        { children: state.selected || keepMounted ? children : null },
      ),
      className,
      style,
    },
  });
}
