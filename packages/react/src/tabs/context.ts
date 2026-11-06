import { createContext, useContext } from "react";
import type { ChangeDetails } from "@densedash/core";

/** Number keys select the first nine tabs, through `tabs.select.1` … `tabs.select.9`. */
export const numbered = 9;

export type TabsChangeReason = "keyboard" | "pointer";

/** One tab. `label` names the tab and its number-key command in the legend. */
export interface TabItem<Value extends string = string> {
  readonly value: Value;
  readonly label: string;
  readonly disabled?: boolean | undefined;
}

export interface TabsContextValue {
  readonly id: string;
  /** The number-key registration, supplied by the mounted command owner. */
  readonly commandScope?: string;
  readonly label: string | undefined;
  readonly items: readonly TabItem[];
  readonly value: string | undefined;
  /** The one tab in the page's tab order: the selected tab, else the first enabled tab. */
  readonly tabStop: string | undefined;
  /** Returns false when the item is missing or disabled, or the change was canceled. */
  select(value: string, reason: TabsChangeReason, event: Event | undefined): boolean;
  /** The mounted `<Tabs.List>`s in mount order; the first renders the ids panels point at. */
  readonly lists: readonly string[];
  /** Adds a list to `lists` and returns its removal. */
  registerList(list: string): () => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * The id prefix of the enclosing list's tabs. Every list shows the same tabs, so a second list
 * prefixes its tab ids with its own id to keep them unique.
 */
export const TabsListContext = createContext<string | undefined>(undefined);

export function useTabsContext(consumer: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (context === null)
    throw new Error(`densedash: ${consumer} must be rendered inside <Tabs.Root>.`);
  return context;
}

export function tabId(root: string, index: number): string {
  return `${root}-tab-${index}`;
}

export function panelId(root: string, index: number): string {
  return `${root}-panel-${index}`;
}

export function changeDetails(
  reason: TabsChangeReason,
  event: Event | undefined,
): ChangeDetails<TabsChangeReason> {
  let canceled = false;
  return {
    reason,
    event,
    cancel() {
      canceled = true;
    },
    get canceled() {
      return canceled;
    },
  };
}
