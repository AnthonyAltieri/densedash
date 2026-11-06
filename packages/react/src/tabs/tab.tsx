import { useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
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
  extends ElementAttributes<HTMLButtonElement>, PartProps<TabsTabState> {
  /** Defaults to the item's label. */
  readonly children?: ReactNode | undefined;
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
  const {
    id,
    commandScope,
    items,
    value: selected,
    tabStop,
    select,
  } = useTabsContext("<Tabs.Tab>");
  const index = items.findIndex((item) => item.value === value);
  const item = items[index];
  const command = index >= 0 && index < numbered ? `tabs.select.${index + 1}` : undefined;
  // The keymap republishes after overrides change, so it is the signal to read the keys again.
  const hotkey = useStore(commands.keymap, () => {
    const [first] = command === undefined ? [] : commands.keys(command, commandScope);
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
          // Roving tab stop: Tab reaches one tab, and the list's arrow-key commands move focus.
          tabIndex: value === tabStop ? 0 : -1,
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
