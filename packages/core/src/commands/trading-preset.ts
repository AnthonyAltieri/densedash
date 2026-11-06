import type { KeyboardHotkey } from "../ports/keyboard.js";

function definePreset<const Id extends string>(
  preset: Readonly<Record<Id, readonly KeyboardHotkey[]>>,
): Readonly<Record<Id, readonly KeyboardHotkey[]>> {
  return preset;
}

/** Keys only: navigation handlers and confirmation prompts belong to the app. */
export const tradingPreset = definePreset({
  "tree.next": ["J", "ArrowDown", "Shift+ArrowDown"],
  "tree.prev": ["K", "ArrowUp", "Shift+ArrowUp"],
  "tree.first": ["Home", "Control+U"],
  "tree.last": ["End", "Control+D"],
  "tree.page-up": ["PageUp"],
  "tree.page-down": ["PageDown"],
  "tree.parent": ["Alt+ArrowUp"],
  "tree.expand": ["L", "ArrowRight"],
  "tree.collapse": ["H", "ArrowLeft"],
  // Unbound actions stay out of Legend until an app supplies an override.
  "tree.toggle": [],
  "tree.select": ["Space"],
  "tree.extend-selection": ["Shift+Space"],
  "tree.open": ["Enter"],
  "table.sort": ["S"],
  "table.next-column": ["Shift+S"],
  "tabs.select.1": ["1"],
  "tabs.select.2": ["2"],
  "tabs.select.3": ["3"],
  "tabs.select.4": ["4"],
  "tabs.select.5": ["5"],
  "tabs.select.6": ["6"],
  "tabs.select.7": ["7"],
  "tabs.select.8": ["8"],
  "tabs.select.9": ["9"],
  // Bound by the focused tab list only, so ArrowRight and ArrowLeft stay free in panels.
  "tabs.next": ["ArrowRight"],
  "tabs.prev": ["ArrowLeft"],
  "tabs.first": ["Home"],
  "tabs.last": ["End"],
  // A vertical tab list's next and previous tab.
  "tabs.down": ["ArrowDown"],
  "tabs.up": ["ArrowUp"],
  next: ["J", "ArrowDown"],
  previous: ["K", "ArrowUp"],
  open: ["Enter"],
  approve: ["Shift+Y"],
  confirm: ["Y"],
  cancel: ["N", "Escape"],
  "p-home": [["G", "H"]],
});

/** A second Tree/List's complete layer: only the four shifted navigation keys. */
export const shiftedTreePreset = definePreset({
  "tree.next": ["Shift+J"],
  "tree.prev": ["Shift+K"],
  "tree.expand": ["Shift+L"],
  "tree.collapse": ["Shift+H"],
});
