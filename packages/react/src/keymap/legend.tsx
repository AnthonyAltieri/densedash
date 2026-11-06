import type { ReactElement } from "react";
import { useKernelFor } from "../context.js";
import { legendItems, legendKeys } from "./legend-items.js";
import type { LegendOptions } from "./legend-items.js";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";

export interface LegendState {
  /** No active command matches. */
  readonly empty: boolean;
}

export interface LegendProps
  extends ElementAttributes<HTMLDivElement>, PartProps<LegendState>, LegendOptions {}

/**
 * One item per active group, with its keys side by side. Page layers keep their instance
 * names; secondary hints are available with `all`. Disabled and unbound commands are omitted.
 * During confirmation it lists the confirm and cancel controls.
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
  const kernel = useKernelFor("<Keymap.Legend>");
  const keymap = useStore(kernel.commands.keymap);
  const items = legendItems({ entries: keymap, filter, groupBy, order, all, labels });
  const state: LegendState = { empty: items.length === 0 };
  const children = items.map((item) => (
    <div key={item.id} data-slot="keymap-legend-group" data-group={item.group}>
      <div
        data-slot="keymap-legend-item"
        data-group={item.group}
        data-command={item.group === undefined ? item.entries[0]?.command : undefined}
        data-layer={item.entries[0]?.layer}
      >
        <span data-slot="keymap-legend-keys">
          {legendKeys({ entries: item.entries, alternatives: all || item.group === undefined })}
        </span>
        <span data-slot="keymap-legend-label">{item.label}</span>
      </div>
    </div>
  ));
  return useRender({
    render,
    ref,
    state,
    props: {
      ...mergeProps(
        { "data-slot": "keymap-legend", role: "group", "aria-label": "Keyboard shortcuts" },
        props,
        { children },
      ),
      className,
      style,
    },
  });
}
