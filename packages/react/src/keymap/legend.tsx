import type { ReactElement } from "react";
import type { KeymapEntry } from "@densedash/core";
import { useKernelFor } from "../context.js";
import { Kbd } from "../kbd.js";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";

export interface LegendState {
  /** No active command matches. */
  readonly empty: boolean;
}

export interface LegendProps extends ElementAttributes<HTMLDivElement>, PartProps<LegendState> {
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
    const name = entry.layer ?? entry.group;
    const group = groups.get(name);
    if (group) group.entries.push(entry);
    else groups.set(name, { name, entries: [entry] });
  }
  return [...groups.values()];
}

/**
 * Lists the active keymap: page layers and commands whose scope has focus, with formatted
 * keys grouped by instance `layer`, then `group`. Disabled commands and commands without keys are omitted. During a confirmation
 * it lists the confirm and cancel controls.
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
  const entries = keymap.filter(
    (entry) => entry.enabled && entry.keys.length > 0 && (filter === undefined || filter(entry)),
  );
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
          data-layer={entry.layer}
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
