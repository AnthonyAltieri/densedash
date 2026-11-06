import { useState } from "react";
import { shiftedTreePreset } from "@densedash/core";
import { useStore } from "@densedash/react";
import { Footer } from "../ui/footer.js";
import { Keymap, useCommands } from "../ui/keymap.js";
import { Tabs } from "../ui/tabs.js";
import { Tree, useTree } from "../ui/tree.js";

const desks = [
  { id: "equities", label: "Equities", children: [{ id: "aapl", label: "Apple" }] },
  { id: "fx", label: "Foreign exchange", children: [{ id: "eur", label: "EUR / USD" }] },
  { id: "cash", label: "Cash" },
];
const views = [
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
] as const;

function Explorer({ label, shifted = false }: { label: string; shifted?: boolean }) {
  const tree = useTree({
    data: desks,
    getRowId: (desk) => desk.id,
    getSubRows: (desk) => desk.children,
    getTextValue: (desk) => desk.label,
    highlighted: { defaultValue: "equities" },
    keys: { label, ...(shifted ? { preset: shiftedTreePreset } : {}) },
  });
  const state = useStore(tree.state);
  return (
    <div data-slot="example-stack">
      <h3>{label}</h3>
      <Tree.Root tree={tree} aria-label={label}>
        <Tree.Viewport tree={tree}>
          {(row) => (
            <Tree.Row row={row}>
              <Tree.Indent />
              <Tree.Toggle />
              {row.original.label}
            </Tree.Row>
          )}
        </Tree.Viewport>
      </Tree.Root>
      <output aria-label={`${label} cursor`}>{state.highlighted ?? "none"}</output>
    </div>
  );
}

function Actions() {
  const [status, setStatus] = useState("Ready");
  useCommands(
    [
      { id: "p-home", label: "Home", group: "Navigation", run: () => setStatus("Home opened") },
      {
        id: "approve",
        label: "Approve order",
        group: "Orders",
        confirm: { prompt: "Approve this order?" },
        run: () => setStatus("Order approved"),
      },
    ],
    { keys: { label: "page" } },
  );
  return (
    <div data-slot="example-stack">
      <p>
        Try j/k/l/h for sidebar, Shift+J/K/L/H for list, and 1–3 for detail tabs. They work across
        the page, including on buttons and tabs. Editable fields keep their typing keys. A List uses
        the same keys option as these two Trees.
      </p>
      <Explorer label="sidebar" />
      <Explorer label="list" shifted />
      <Tabs.Root items={views} label="detail tabs" keys={{ label: "detail" }}>
        <Tabs.List />
        <Tabs.Panel value="positions">Open positions</Tabs.Panel>
        <Tabs.Panel value="orders">Working orders</Tabs.Panel>
        <Tabs.Panel value="activity">Recent fills</Tabs.Panel>
      </Tabs.Root>
      <label>
        Notes <input aria-label="Notes" />
      </label>
      <label>
        Description <textarea aria-label="Description" />
      </label>
      <div contentEditable suppressContentEditableWarning role="textbox" aria-label="Draft">
        Editable draft
      </div>
      <p>Try g then h, or Shift+Y followed by y.</p>
      <output aria-live="polite">{status}</output>
      <Keymap.Legend />
      <Keymap.ChordHint />
      <Keymap.ConfirmPrompt />
      <Footer.Root>
        <Footer.Legend groupBy={(entry) => entry.layer ?? entry.group} />
      </Footer.Root>
    </div>
  );
}

export default function KeymapExample() {
  return (
    <Keymap.Provider>
      <Keymap.Scope name="orders-demo" page aria-label="Key layers demo">
        <Actions />
      </Keymap.Scope>
    </Keymap.Provider>
  );
}
