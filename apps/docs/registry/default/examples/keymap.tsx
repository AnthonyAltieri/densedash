import { useState } from "react";
import type { KeysOptions } from "@densedash/core";
import { Cell } from "../docs/cell.js";
import { Frame } from "../docs/frame.js";
import { Keymap, useCommands } from "../ui/keymap.js";

const keys = { preset: { increase: ["N"], decrease: ["P"] } } satisfies KeysOptions;

function OrderSize() {
  const [size, setSize] = useState(300);
  useCommands([
    { id: "increase", label: "Increase by 100", run: () => setSize((n) => n + 100) },
    { id: "decrease", label: "Decrease by 100", run: () => setSize((n) => Math.max(0, n - 100)) },
  ]);
  return (
    <>
      <Cell.Figure value={size} unit="shares" />
      <Keymap.Legend />
      <Cell.Note>Click the number, then press a key.</Cell.Note>
    </>
  );
}

export default function KeymapExample() {
  return (
    <Frame title="Order size" count="2 commands" footer={false}>
      <Keymap.Provider keys={keys}>
        <Keymap.Scope name="order-size" tabIndex={0} aria-label="Order size">
          <OrderSize />
        </Keymap.Scope>
      </Keymap.Provider>
    </Frame>
  );
}
