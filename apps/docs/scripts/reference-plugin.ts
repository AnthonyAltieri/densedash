import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createKernel, tradingPreset } from "@densedash/core";
import tokens from "../../../packages/css/src/generated/tokens.json" with { type: "json" };
import type { Plugin } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const id = "virtual:densedash-reference";
const styles = {
  theme: [],
  kbd: ["kbd"],
  keymap: ["kbd", "keymap-scope", "keymap-legend", "keymap-chord-hint", "keymap-confirm-prompt"],
  tree: ["tree"],
  list: ["tree"],
  table: ["table"],
  tabs: ["tabs", "kbd"],
  footer: ["footer", "kbd"],
};

/** Emit reference data only: source CSS, kernel construction and formatting stay on the build side. */
export function referencePlugin(): Plugin {
  return {
    name: "densedash-reference",
    resolveId(source) {
      if (source === id) return `\0${id}`;
    },
    async load(source) {
      if (source !== `\0${id}`) return;
      this.addWatchFile(`${root}packages/css/src/generated/tokens.json`);
      this.addWatchFile(`${root}packages/core/src/commands/trading-preset.ts`);
      const css: Record<string, typeof tokens.tokens> = {};
      for (const [name, files] of Object.entries(styles)) {
        const used = new Set<string>();
        for (const file of files) {
          const path = `${root}packages/css/src/components/${file}.css`;
          this.addWatchFile(path);
          const text = await readFile(path, "utf8");
          for (const match of text.matchAll(/var\((--dd-[\w-]+)/g)) used.add(match[1]!);
        }
        css[name] = tokens.tokens.filter((token) => name === "theme" || used.has(token.name));
      }
      const kernel = createKernel();
      try {
        const keys = Object.entries(tradingPreset).map(([command, hotkeys]) => ({
          command,
          keys: hotkeys.map(kernel.ports.keyboard.format),
        }));
        return `export default ${JSON.stringify({ css, keys })};`;
      } finally {
        kernel.dispose();
      }
    },
  };
}
