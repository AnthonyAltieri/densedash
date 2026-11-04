import type { ComponentPropsWithRef, ReactElement } from "react";
import type { KeymapEntry } from "@densedash/core";
import { useKernelFor } from "../context.js";
import { Kbd } from "../kbd.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";

export interface LegendState {
  /** No active command matches. */
  readonly empty: boolean;
}

export interface LegendProps
  extends
    Omit<ComponentPropsWithRef<"div">, "className" | "style" | "children">,
    PartProps<LegendState> {
  /** Keeps matching entries only, for example one group. */
  readonly filter?: ((entry: KeymapEntry) => boolean) | undefined;
}

interface LegendGroup {
  readonly name: string | undefined;
  readonly entries: KeymapEntry[];
}

// Groups keep the keymap's precedence order of first appearance; ungrouped entries share one.
function groupEntries(entries: readonly KeymapEntry[]): LegendGroup[] {
  const groups = new Map<string | undefined, LegendGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.group);
    if (group) group.entries.push(entry);
    else groups.set(entry.group, { name: entry.group, entries: [entry] });
  }
  return [...groups.values()];
}

/**
 * Lists the active keymap: commands whose scope has focus, with formatted keys, grouped by
 * `group`. During a confirmation it lists the confirm and cancel controls.
 */
export function Legend({
  filter,
  render,
  ref,
  className,
  style,
  ...props
}: LegendProps): ReactElement {
  const kernel = useKernelFor("<Keymap.Legend>");
  const keymap = useStore(kernel.commands.keymap);
  const entries = filter === undefined ? keymap : keymap.filter(filter);
  const state: LegendState = { empty: entries.length === 0 };
  const children = groupEntries(entries).map((group) => (
    <div key={group.name ?? ""} data-slot="keymap-legend-group" data-group={group.name}>
      {group.name === undefined ? null : (
        <div data-slot="keymap-legend-group-label">{group.name}</div>
      )}
      {group.entries.map((entry) => (
        <div
          key={`${entry.scope}\u0000${entry.command}`}
          data-slot="keymap-legend-item"
          data-command={entry.command}
        >
          <span data-slot="keymap-legend-keys">
            {entry.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </span>
          <span data-slot="keymap-legend-label">{entry.label}</span>
        </div>
      ))}
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
