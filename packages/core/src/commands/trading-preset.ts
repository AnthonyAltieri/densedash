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
  "tree.first": ["Home"],
  "tree.last": ["End"],
  "tree.page-up": ["Control+U", "PageUp"],
  "tree.page-down": ["Control+D", "PageDown"],
  "tree.parent": ["Alt+ArrowUp"],
  "tree.expand": ["L", "ArrowRight"],
  "tree.collapse": ["H", "ArrowLeft"],
  "tree.toggle": [],
  "tree.select": ["Space"],
  "tree.extend-selection": ["Shift+Space"],
  "tree.open": ["Enter"],
  next: ["J", "ArrowDown"],
  previous: ["K", "ArrowUp"],
  first: ["Control+U"],
  last: ["Control+D"],
  open: ["Enter"],
  collapse: ["H", "ArrowLeft"],
  expand: ["L", "ArrowRight"],
  approve: ["Shift+Y"],
  reject: ["Shift+X"],
  back: ["["],
  forward: ["]"],
  confirm: ["Y"],
  cancel: ["N", "Escape"],
  "p-components": [["G", "C"]],
  "p-home": [["G", "H"]],
  "p-hyperliquid-account": [["G", "A"]],
  "p-portfolio-studies": [["G", "P", "S"]],
  "p-portfolio-paper": [["G", "P", "P"]],
  "p-portfolio": [["G", "P", "B"]],
  "p-market": [["G", "M"]],
  "p-ideas": [["G", "R"]],
  "p-ops-activity": [["G", "O", "A"]],
  "p-ops-notifications": [["G", "O", "N"]],
  "p-ops-backfills": [["G", "O", "B"]],
});
