import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { List as TabList } from "../tabs/list.js";
import { Root as TabsRoot } from "../tabs/root.js";
import type { TabsRootProps } from "../tabs/root.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";

export interface DetailState {}

export interface DetailProps<Value extends string>
  extends
    ElementAttributes<HTMLElement>,
    PartProps<DetailState>,
    Pick<
      TabsRootProps<Value>,
      "items" | "value" | "defaultValue" | "onValueChange" | "label" | "name" | "keys"
    > {
  /** The pane's heading above the tabs, such as the highlighted item's path, name and status. */
  readonly header?: ReactNode;
  /** The panels: one `<Tabs.Panel value>` per item, filled in by the app. */
  readonly children?: ReactNode | undefined;
}

/**
 * The pane for whatever the list highlights: the app's header, then numbered Tabs whose number
 * keys come from the `tabs.select.N` commands (pass `keys` to answer throughout the page).
 */
export function Detail<const Value extends string>({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  name,
  keys,
  header,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: DetailProps<Value>): ReactElement {
  const state: DetailState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "section",
    props: {
      ...mergeProps<"section">({ "data-slot": "app-shell-detail" }, props, {
        children: (
          <TabsRoot
            items={items}
            {...(value === undefined ? {} : { value })}
            {...(defaultValue === undefined ? {} : { defaultValue })}
            {...(onValueChange === undefined ? {} : { onValueChange })}
            label={label}
            name={name}
            keys={keys}
          >
            <div data-slot="app-shell-detail-header">
              {header}
              <TabList />
            </div>
            <div data-slot="app-shell-detail-body">{children}</div>
          </TabsRoot>
        ),
      }),
      className,
      style,
    },
  });
}
