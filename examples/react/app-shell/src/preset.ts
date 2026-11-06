import { shiftedTreePreset } from "@densedash/core";
import type { Preset } from "@densedash/core";

// Every key in the example. Swap these objects to rebind; the shell's parts never name keys.

/** The sidebar's page-wide layer: j and k move, l opens a group, h closes it or goes up. */
export const sidebarKeys = {
  "tree.next": ["J"],
  "tree.prev": ["K"],
  "tree.expand": ["L"],
  "tree.collapse": ["H"],
} as const satisfies Preset;

/** The list's layer: the same moves with Shift. */
export const listKeys = shiftedTreePreset;
