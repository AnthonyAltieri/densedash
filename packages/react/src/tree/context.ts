import { createContext, useContext } from "react";
import type { CSSProperties } from "react";
import type { Key, Tree as CoreTree, TreeRow, TreeSnapshot } from "@densedash/core";
import { normalizeProps } from "../normalize-props.js";
import type { NormalizedProps } from "../normalize-props.js";
import type { StyleProps } from "../use-render.js";
import type { TreeHandle } from "./handle.js";

export interface TreeContextValue {
  readonly handle: TreeHandle<unknown>;
  /** Null until the root has created the core tree. */
  readonly core: CoreTree<unknown> | null;
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
  /** Changes whenever the row's highlight, selection or tab stop changes. */
  readonly token: number;
}

export const RowContext = createContext<RowContextValue | null>(null);

export function useRowContext(consumer: string): RowContextValue {
  const context = useContext(RowContext);
  if (context === null) throw new Error(`densedash: ${consumer} must be rendered inside a row.`);
  return context;
}

const tabStops = new WeakMap<TreeSnapshot<unknown>, Key | undefined>();

// The roving tab stop is per snapshot, so compute it once rather than once per row.
function tabStop(snapshot: TreeSnapshot<unknown>): Key | undefined {
  if (tabStops.has(snapshot)) return tabStops.get(snapshot);
  const rows = snapshot.rows;
  const key =
    rows.find((row) => row.key === snapshot.highlighted && !row.disabled)?.key ??
    rows.find((row) => !row.disabled)?.key;
  tabStops.set(snapshot, key);
  return key;
}

const indexes = new WeakMap<readonly TreeRow<unknown>[], Map<Key, number>>();

/** The row's current visible index, built once per snapshot rather than searched per row. */
export function rowIndex(snapshot: TreeSnapshot<unknown>, key: Key): number {
  let index = indexes.get(snapshot.rows);
  if (index === undefined) {
    index = new Map(snapshot.rows.map((row, position) => [row.key, position]));
    indexes.set(snapshot.rows, index);
  }
  return index.get(key) ?? -1;
}

export const HIGHLIGHTED = 1;
export const SELECTED = 2;
export const TAB_STOP = 4;

/** Everything a row's props read from tree state, packed so `useStore` compares it cheaply. */
export function rowToken(snapshot: TreeSnapshot<unknown>, key: Key): number {
  return (
    (snapshot.highlighted === key ? HIGHLIGHTED : 0) |
    (snapshot.selected.has(key) ? SELECTED : 0) |
    (tabStop(snapshot) === key ? TAB_STOP : 0)
  );
}

// The core getters read mutable state. Each wrapper takes the state it depends on as an
// argument, so a memoizing compiler recomputes the props whenever that state changes.
export function rootProps(core: CoreTree<unknown>, _snapshot: object): NormalizedProps {
  return normalizeProps(core.getRootProps());
}

export function rowProps(core: CoreTree<unknown>, row: TreeRow<unknown>, _token: number) {
  return normalizeProps(core.getRowProps(row.key));
}

export function toggleProps(core: CoreTree<unknown>, row: TreeRow<unknown>, _token: number) {
  return normalizeProps(core.getToggleProps(row.key));
}

/** Keeps the core's style (`--dd-depth`) under the consumer's `style` value or function. */
export function partStyle<State>(
  base: CSSProperties | undefined,
  style: StyleProps<State>["style"],
): StyleProps<State>["style"] {
  if (style === undefined) return base;
  return (state) => ({ ...base, ...(typeof style === "function" ? style(state) : style) });
}
