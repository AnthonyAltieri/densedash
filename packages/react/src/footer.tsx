import type { ReactElement, ReactNode } from "react";
import { useKernelFor } from "./context.js";
import { legendItems, legendKeys } from "./keymap/legend-items.js";
import type { LegendOptions } from "./keymap/legend-items.js";
import type { ElementAttributes } from "./element-attributes.js";
import { mergeProps } from "./merge-props.js";
import { useRender } from "./use-render.js";
import type { PartProps } from "./use-render.js";
import { useStore } from "./use-store.js";

export interface RootState {}

export interface RootProps extends ElementAttributes<HTMLElement>, PartProps<RootState> {
  readonly children?: ReactNode | undefined;
}

/** The bar at the bottom of a shell: `<footer data-slot="footer">`. Holds a Legend and a Status. */
export function Root({ render, ref, className, style, ...props }: RootProps): ReactElement {
  const state: RootState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "footer",
    props: { ...mergeProps<"footer">({ "data-slot": "footer" }, props), className, style },
  });
}

export interface LegendState {
  /** No visible hint has a key. */
  readonly empty: boolean;
}

export interface LegendProps
  extends ElementAttributes<HTMLDivElement>, PartProps<LegendState>, LegendOptions {}

/**
 * The keys bound right now, read from the kernel's keymap: when a scope loses focus or
 * unmounts, its keys leave the legend. Each item is a key (or several) and a label.
 */
export function Legend({
  filter,
  groupBy,
  order,
  all,
  labels,
  render,
  ref,
  className,
  style,
  ...props
}: LegendProps): ReactElement {
  const kernel = useKernelFor("<Footer.Legend>");
  const keymap = useStore(kernel.commands.keymap);
  const items = legendItems({ entries: keymap, filter, groupBy, order, all, labels });
  const state: LegendState = { empty: items.length === 0 };
  const children = items.map((item) => (
    <span
      key={item.id}
      data-slot="footer-legend-item"
      data-group={item.group}
      data-command={item.group === undefined ? item.entries[0]?.command : undefined}
    >
      {legendKeys({ entries: item.entries })}{" "}
      <span data-slot="footer-legend-label">{item.label}</span>
    </span>
  ));
  return useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        { "data-slot": "footer-legend", role: "group", "aria-label": "Keyboard shortcuts" },
        props,
        { children },
      ),
      className,
      style,
    },
  });
}

export interface StatusState {}

export interface StatusProps extends ElementAttributes<HTMLDivElement>, PartProps<StatusState> {
  readonly children?: ReactNode | undefined;
}

/** The app's status slot, such as `updated 09:41`, at the end of the footer row. */
export function Status({ render, ref, className, style, ...props }: StatusProps): ReactElement {
  const state: StatusState = {};
  return useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps({ "data-slot": "footer-status" }, props),
      className,
      style,
    },
  });
}
