import { useState } from "react";
import type { KeysOptions } from "@densedash/core";
import { Keymap, useCommands } from "../ui/keymap.js";

const keys = { overrides: { open: ["O"] } } satisfies KeysOptions;

function OpenOrder() {
  const [count, setCount] = useState(0);
  useCommands([{ id: "open", label: "Open order", run: () => setCount((value) => value + 1) }]);
  return (
    <div data-slot="example-stack">
      <output aria-live="polite">Opened: {count}</output>
      <Keymap.Legend />
    </div>
  );
}

export default function OverrideExample() {
  return (
    <Keymap.Provider keys={keys}>
      <Keymap.Scope name="override" tabIndex={0} aria-label="Overridden open command">
        <OpenOrder />
      </Keymap.Scope>
    </Keymap.Provider>
  );
}
