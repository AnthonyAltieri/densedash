import { createContext, useContext } from "react";
import type { CSSProperties } from "react";
import type { NavigableTable, RowData } from "@densedash/core";
import { normalizeProps } from "../normalize-props.js";
import type { NormalizedProps } from "../normalize-props.js";
import type { StyleProps } from "../use-render.js";
import type { TreeHandleBase, TreeRow, TreeSnapshot } from "./handle.js";

export interface TreeContextValue {
  readonly handle: TreeHandleBase<unknown>;
  /** Null until the root has created the TanStack table and its navigation. */
  readonly core: NavigableTable<RowData> | null;
  /** The toggle labels, so toggles re-render when they change. */
  readonly labels: string;
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext(consumer: string): TreeContextValue {
  const context = useContext(TreeContext);
  if (context === null) {
    throw new Error(`densedash: ${consumer} must be rendered inside <Tree.Root> or <List.Root>.`);
  }
  return context;
}

export interface RowContextValue {
  readonly row: TreeRow<unknown>;
  /** Changes whenever the row's highlight, selection, expansion or tab stop changes. */
  readonly token: number;
}

export const RowContext = createContext<RowContextValue | null>(null);

export function useRowContext(consumer: string): RowContextValue {
  const context = useContext(RowContext);
  if (context === null) throw new Error(`densedash: ${consumer} must be rendered inside a row.`);
  return context;
}

interface RowIndex {
  /** Visible index by row id. */
  readonly index: Map<string, number>;
  /** `aria-posinset/aria-setsize` by row id. */
  readonly position: Map<string, string>;
}

const indexes = new WeakMap<readonly TreeRow<unknown>[], RowIndex>();

// Built once per visible row model rather than searched per row.
function rowsIndex(rows: readonly TreeRow<unknown>[]): RowIndex {
  let found = indexes.get(rows);
  if (found !== undefined) return found;
  const index = new Map<string, number>();
  const siblings = new Map<string | undefined, string[]>();
  rows.forEach((row, position) => {
    index.set(row.id, position);
    const group = siblings.get(row.parentId);
    if (group === undefined) siblings.set(row.parentId, [row.id]);
    else group.push(row.id);
  });
  const position = new Map<string, string>();
  for (const group of siblings.values()) {
    group.forEach((id, offset) => position.set(id, `${offset + 1}/${group.length}`));
  }
  found = { index, position };
  indexes.set(rows, found);
  return found;
}

/** The row's current visible index. */
export function rowIndex(snapshot: TreeSnapshot<unknown>, id: string): number {
  return rowsIndex(snapshot.rows).index.get(id) ?? -1;
}

/** The row's `aria-posinset` and `aria-setsize`, which change for siblings on every insertion. */
export function rowPosition(snapshot: TreeSnapshot<unknown>, id: string): string {
  return rowsIndex(snapshot.rows).position.get(id) ?? "";
}

const tabStops = new WeakMap<TreeSnapshot<unknown>, string | undefined>();

// The roving tab stop is per snapshot, so compute it once rather than once per row.
function tabStop(snapshot: TreeSnapshot<unknown>): string | undefined {
  if (tabStops.has(snapshot)) return tabStops.get(snapshot);
  const rows = snapshot.rows;
  const highlighted =
    snapshot.highlighted === null ? undefined : rows[rowIndex(snapshot, snapshot.highlighted)];
  const id =
    (highlighted?.getCanSelect() ? highlighted.id : undefined) ??
    rows.find((row) => row.getCanSelect())?.id;
  tabStops.set(snapshot, id);
  return id;
}

export const HIGHLIGHTED = 1;
export const SELECTED = 2;
export const TAB_STOP = 4;
export const EXPANDED = 8;

/** Everything a row's props read from tree state, packed so `useStore` compares it cheaply. */
export function rowToken(snapshot: TreeSnapshot<unknown>, id: string): number {
  const { expanded } = snapshot;
  return (
    (snapshot.highlighted === id ? HIGHLIGHTED : 0) |
    (snapshot.rowSelection[id] ? SELECTED : 0) |
    (tabStop(snapshot) === id ? TAB_STOP : 0) |
    (expanded === true || expanded[id] ? EXPANDED : 0)
  );
}

// The core getters read mutable state. Each wrapper takes the state it depends on as an
// argument, so a memoizing compiler recomputes the props whenever that state changes.
export function rootProps(core: NavigableTable<RowData>, _snapshot: object): NormalizedProps {
  return normalizeProps(core.getRootProps());
}

export function rowProps(
  core: NavigableTable<RowData>,
  row: TreeRow<unknown>,
  _token: number,
  _position: string,
) {
  return normalizeProps(core.getRowProps(row.id));
}

export function toggleProps(
  core: NavigableTable<RowData>,
  row: TreeRow<unknown>,
  _token: number,
  _labels: string,
) {
  return normalizeProps(core.getToggleProps(row.id));
}

/** Keeps the core's style (`--dd-depth`) under the consumer's `style` value or function. */
export function partStyle<State>(
  base: CSSProperties | undefined,
  style: StyleProps<State>["style"],
): StyleProps<State>["style"] {
  if (style === undefined) return base;
  return (state) => ({ ...base, ...(typeof style === "function" ? style(state) : style) });
}
