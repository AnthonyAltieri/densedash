import { useState } from "react";
import type { KeysOptions, Preset } from "@densedash/core";
import { Keymap, useCommands } from "../ui/keymap.js";

const preset = { next: ["N"], previous: ["P"] } satisfies Preset;
const keys = { preset } satisfies KeysOptions;

function Counter() {
  const [count, setCount] = useState(0);
  useCommands([
    { id: "next", label: "Increase", run: () => setCount((value) => value + 1) },
    { id: "previous", label: "Decrease", run: () => setCount((value) => value - 1) },
  ]);
  return (
    <div data-slot="example-stack">
      <output aria-live="polite">Count: {count}</output>
      <Keymap.Legend />
    </div>
  );
}

export default function PresetExample() {
  return (
    <Keymap.Provider keys={keys}>
      <Keymap.Scope name="replacement" tabIndex={0} aria-label="Replacement preset counter">
        <Counter />
      </Keymap.Scope>
    </Keymap.Provider>
  );
}
