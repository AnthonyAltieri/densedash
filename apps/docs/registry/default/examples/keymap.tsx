import { useState } from "react";
import { Keymap, useCommands } from "../ui/keymap.js";

function Actions() {
  const [status, setStatus] = useState("Ready");
  useCommands([
    { id: "next", label: "Next order", group: "Orders", run: () => setStatus("Next order") },
    { id: "p-home", label: "Home", group: "Navigation", run: () => setStatus("Home opened") },
    {
      id: "approve",
      label: "Approve order",
      group: "Orders",
      confirm: { prompt: "Approve this order?" },
      run: () => setStatus("Order approved"),
    },
  ]);
  return (
    <div data-slot="example-stack">
      <p>Focus here. Try j, g then h, or Shift+Y followed by y.</p>
      <output aria-live="polite">{status}</output>
      <Keymap.Legend />
      <Keymap.ChordHint />
      <Keymap.ConfirmPrompt />
    </div>
  );
}

export default function KeymapExample() {
  return (
    <Keymap.Provider>
      <Keymap.Scope name="orders-demo" tabIndex={0} aria-label="Order actions">
        <Actions />
      </Keymap.Scope>
    </Keymap.Provider>
  );
}
