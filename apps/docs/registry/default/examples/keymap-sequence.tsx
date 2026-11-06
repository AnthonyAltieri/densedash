import { useState } from "react";
import type { KeysOptions } from "@densedash/core";
import { Cell } from "../docs/cell.js";
import { Frame } from "../docs/frame.js";
import { Kbd } from "../ui/kbd.js";
import { Keymap, useCommands } from "../ui/keymap.js";

const pages = [
  { id: "home", label: "Home" },
  { id: "ideas", label: "Ideas" },
  { id: "portfolio", label: "Portfolio" },
  { id: "risk", label: "Risk" },
] as const;

const keys = {
  preset: {
    "go.home": [["G", "H"]],
    "go.ideas": [["G", "R"]],
    "go.portfolio": [["G", "P"]],
    "go.risk": [["G", "K"]],
  },
} satisfies KeysOptions;

function Pages() {
  const [current, setCurrent] = useState<(typeof pages)[number]>(pages[0]);
  useCommands(
    pages.map((page) => ({
      id: `go.${page.id}`,
      label: page.label,
      group: "Go to",
      run: () => setCurrent(page),
    })),
  );
  return (
    <>
      <nav data-slot="pages" aria-label="Pages">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            aria-current={page === current ? "page" : undefined}
            onClick={() => setCurrent(page)}
          >
            <Cell.Name>{page.label}</Cell.Name>
            <Kbd hotkey={keys.preset[`go.${page.id}`][0]} />
          </button>
        ))}
      </nav>
      <output data-slot="page">{current.label}</output>
      <Cell.Note>
        Click a page, then press <Kbd hotkey="G" /> and wait.
      </Cell.Note>
      <Keymap.ChordHint />
    </>
  );
}

export default function KeymapSequenceExample() {
  return (
    <Frame title="Go to a page" count="4 commands" footer={false} variant="keymap-sequence">
      <Keymap.Provider keys={keys}>
        <Keymap.Scope name="go-to" aria-label="Go to a page">
          <Pages />
        </Keymap.Scope>
      </Keymap.Provider>
    </Frame>
  );
}
