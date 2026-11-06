import type { ReactNode } from "react";
import type { KeymapEntry } from "@densedash/core";
import { Kbd, rangeLabels } from "../kbd.js";

/** Shared presentation options for Footer.Legend and Keymap.Legend. */
export interface LegendOptions {
  /** Keeps matching entries only. An explicit filter also includes secondary hints. */
  readonly filter?: ((entry: KeymapEntry) => boolean) | undefined;
  /**
   * Names and labels each item. Defaults to the instance layer, then the command group;
   * ungrouped commands stand alone. An explicit callback also includes secondary hints.
   */
  readonly groupBy?: ((entry: KeymapEntry) => string | undefined) | undefined;
  /** Group or layer names to list first, in this order. Other items keep keymap order. */
  readonly order?: readonly string[] | undefined;
  /** Include secondary hints as well as the primary hints shown by default. */
  readonly all?: boolean | undefined;
  /** Override default group labels by group id. Layer names and explicit groupBy labels win. */
  readonly labels?: Readonly<Record<string, string>> | undefined;
}

interface LegendItem {
  readonly id: string;
  readonly label: string;
  readonly group: string | undefined;
  readonly entries: KeymapEntry[];
}

// Selection is presentation only: the live keymap still contains every available command.
export function legendItems({
  entries,
  filter,
  groupBy,
  order,
  all,
  labels,
}: LegendOptions & { entries: readonly KeymapEntry[] }): LegendItem[] {
  const selected = filter === undefined ? entries : entries.filter(filter);
  const items = new Map<string, LegendItem>();
  for (const entry of selected) {
    if (!entry.enabled || entry.keys.length === 0) continue;
    if (!all && filter === undefined && groupBy === undefined && entry.legend === "secondary")
      continue;
    const group = groupBy === undefined ? (entry.layer ?? entry.group) : groupBy(entry);
    const id = group === undefined ? `${entry.scope}\u0000${entry.command}` : `\u0000${group}`;
    const item = items.get(id);
    if (item) item.entries.push(entry);
    else {
      const label =
        groupBy !== undefined || entry.layer !== undefined
          ? (group ?? entry.label)
          : group === undefined
            ? entry.label
            : (labels?.[group] ?? entry.groupLabel ?? group);
      items.set(id, { id, label, group, entries: [entry] });
    }
  }
  const result = [...items.values()];
  if (order === undefined || order.length === 0) return result;
  const names = new Set(order);
  const first = [...names].flatMap((name) => result.filter((item) => item.group === name));
  const rest = result.filter((item) => item.group === undefined || !names.has(item.group));
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

export function legendKeys({
  entries,
  alternatives = false,
}: {
  entries: readonly KeymapEntry[];
  alternatives?: boolean;
}): ReactNode {
  const keys = entries.flatMap((entry) => (alternatives ? entry.keys : entry.keys.slice(0, 1)));
  const range = digitRange(keys);
  if (range !== null) return rangeLabels(...range);
  return keys.map((key, index) => (
    <span key={`${index}\u0000${key}`}>
      {index > 0 ? " " : null}
      <Kbd>{key}</Kbd>
    </span>
  ));
}
