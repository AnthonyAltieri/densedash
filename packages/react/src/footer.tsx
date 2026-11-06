import type { ReactElement, ReactNode } from "react";
import type { KeymapEntry } from "@densedash/core";
import { useKernelFor } from "./context.js";
import { Kbd, rangeLabels } from "./kbd.js";
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
  /** No active command has a key. */
  readonly empty: boolean;
}

export interface LegendProps extends ElementAttributes<HTMLDivElement>, PartProps<LegendState> {
  /** Keeps matching entries only, for example the page's own commands. */
  readonly filter?: ((entry: KeymapEntry) => boolean) | undefined;
  /**
   * Names the legend item an entry joins. Entries with the same name share one item labelled
   * with that name; an entry with no name gets an item of its own labelled with its command's
   * label. Defaults to the instance's `layer`, then the command's `group`.
   */
  readonly groupBy?: ((entry: KeymapEntry) => string | undefined) | undefined;
  /**
   * Item names, as `groupBy` returns them, to list first and in this order, such as
   * `["sidebar", "list"]`. Other items follow in keymap precedence order. Defaults to none.
   */
  readonly order?: readonly string[] | undefined;
}

/** One legend item: the entries it joins, in keymap precedence order. */
interface LegendItem {
  readonly id: string;
  readonly label: string;
  readonly group: string | undefined;
  readonly entries: KeymapEntry[];
}

const byGroup = (entry: KeymapEntry): string | undefined => entry.layer ?? entry.group;

// Items keep the keymap's precedence order of first appearance. Disabled and unbound entries
// are left out: the footer lists only keys that answer now.
function legendItems(
  entries: readonly KeymapEntry[],
  groupBy: (entry: KeymapEntry) => string | undefined,
): LegendItem[] {
  const items = new Map<string, LegendItem>();
  for (const entry of entries) {
    if (!entry.enabled || entry.keys.length === 0) continue;
    const group = groupBy(entry);
    const id = group === undefined ? `${entry.scope}\u0000${entry.command}` : `\u0000${group}`;
    const item = items.get(id);
    if (item) item.entries.push(entry);
    else items.set(id, { id, label: group ?? entry.label, group, entries: [entry] });
  }
  return [...items.values()];
}

// Named items move to the front in the given order; the rest keep their order after them.
function orderItems(items: LegendItem[], order: readonly string[] | undefined): LegendItem[] {
  if (order === undefined || order.length === 0) return items;
  const names = new Set(order);
  const first = [...names].flatMap((name) => items.filter((item) => item.group === name));
  const rest = items.filter((item) => item.group === undefined || !names.has(item.group));
  return [...first, ...rest];
}

// Three or more consecutive single digits read as a range, `1–3`.
function digitRange(keys: readonly string[]): readonly [string, string] | null {
  const first = keys[0];
  const last = keys.at(-1);
  if (keys.length < 3 || first === undefined || last === undefined) return null;
  const start = Number(first);
  const consecutive = keys.every((key, index) => /^\d$/.test(key) && Number(key) === start + index);
  return consecutive ? [first, last] : null;
}

function itemKeys(entries: readonly KeymapEntry[]): ReactNode {
  // Each entry shows its first key; legends elsewhere list the alternatives.
  const keys = entries.flatMap((entry) => entry.keys.slice(0, 1));
  const range = digitRange(keys);
  if (range !== null) return rangeLabels(...range);
  return keys.map((key, index) => (
    <span key={`${index}\u0000${key}`}>
      {index > 0 ? " " : null}
      <Kbd>{key}</Kbd>
    </span>
  ));
}

/**
 * The keys bound right now, read from the kernel's keymap: when a scope loses focus or
 * unmounts, its keys leave the legend. Each item is a key (or several) and a label.
 */
export function Legend({
  filter,
  groupBy = byGroup,
  order,
  render,
  ref,
  className,
  style,
  ...props
}: LegendProps): ReactElement {
  const kernel = useKernelFor("<Footer.Legend>");
  const keymap = useStore(kernel.commands.keymap);
  const items = orderItems(
    legendItems(filter === undefined ? keymap : keymap.filter(filter), groupBy),
    order,
  );
  const state: LegendState = { empty: items.length === 0 };
  const children = items.map((item) => (
    <span
      key={item.id}
      data-slot="footer-legend-item"
      data-group={item.group}
      data-command={item.group === undefined ? item.entries[0]?.command : undefined}
    >
      {itemKeys(item.entries)} <span data-slot="footer-legend-label">{item.label}</span>
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
