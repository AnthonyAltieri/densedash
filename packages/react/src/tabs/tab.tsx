import { useEffect } from "react";
import type { ComponentPropsWithRef, ReactElement } from "react";
import { useKernelFor } from "../context.js";
import { Kbd } from "../kbd.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";
import { numbered, panelId, tabId, useTabsContext } from "./context.js";

export interface TabsTabState {
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly value: string;
}

export interface TabsTabProps
  extends
    Omit<ComponentPropsWithRef<"button">, "className" | "style" | "value" | "disabled">,
    PartProps<TabsTabState> {
  /** One of the root's item values. */
  readonly value: string;
}

/**
 * A `tab` button that selects its item on click and shows its number key with `<Kbd>`. The key
 * comes from the `tabs.select.N` command's preset or override; children default to the label.
 */
export function Tab({
  value,
  render,
  ref,
  className,
  style,
  children,
  ...props
}: TabsTabProps): ReactElement {
  const { commands, ports } = useKernelFor("<Tabs.Tab>");
  const { id, items, value: selected, select } = useTabsContext("<Tabs.Tab>");
  const index = items.findIndex((item) => item.value === value);
  const item = items[index];
  const command = index >= 0 && index < numbered ? `tabs.select.${index + 1}` : undefined;
  // The keymap republishes after overrides change, so it is the signal to read the keys again.
  const hotkey = useStore(commands.keymap, () => {
    const [first] = command === undefined ? [] : commands.keys(command);
    return first === undefined ? undefined : ports.keyboard.format(first);
  });

  useEffect(() => {
    if (index < 0)
      ports.reporter.warn(`<Tabs.Tab value="${value}"> matches no item of <Tabs.Root>.`);
  }, [index, ports, value]);

  const state: TabsTabState = {
    selected: value === selected,
    disabled: item?.disabled === true,
    value,
  };
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "button",
    props: {
      ...mergeProps<"button">(
        {
          "data-slot": "tabs-tab",
          type: "button",
          role: "tab",
          id: tabId(id, index),
          "aria-selected": state.selected,
          "aria-controls": panelId(id, index),
          disabled: state.disabled,
          onClick: (event) =>
            select(value, event.detail === 0 ? "keyboard" : "pointer", event.nativeEvent),
        },
        props,
        {
          children: (
            <>
              {hotkey === undefined ? null : <Kbd>{hotkey}</Kbd>}
              {children ?? item?.label}
            </>
          ),
        },
      ),
      className,
      style,
    },
  });
}
