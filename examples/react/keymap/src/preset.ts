import type { Preset } from "@densedash/core";

/** Every key in the example. Swap this object to rebind; components never name keys. */
export const preset = {
  next: ["J", "ArrowDown"],
  previous: ["K", "ArrowUp"],
  star: ["S"],
  delete: ["Shift+D"],
  reply: ["R"],
  archive: ["E"],
  "go-inbox": [["G", "I"]],
  "go-starred": [["G", "S"]],
  "go-archive": [["G", "A"]],
  confirm: ["Y"],
  cancel: ["N", "Escape"],
} as const satisfies Preset;
