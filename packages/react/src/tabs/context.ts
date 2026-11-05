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
  readonly label: string | undefined;
  readonly items: readonly TabItem[];
  readonly value: string | undefined;
  /** The one tab in the page's tab order: the selected tab, else the first enabled tab. */
  readonly tabStop: string | undefined;
  /** Returns false when the item is missing or disabled, or the change was canceled. */
  select(value: string, reason: TabsChangeReason, event: Event | undefined): boolean;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

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
