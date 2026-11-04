import type { KeyboardHotkey } from "../ports/keyboard.js";

function definePreset<const Id extends string>(
  preset: Readonly<Record<Id, readonly KeyboardHotkey[]>>,
): Readonly<Record<Id, readonly KeyboardHotkey[]>> {
  return preset;
}

/** Keys only: navigation handlers and confirmation prompts belong to the app. */
export const tradingPreset = definePreset({
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
