import { useState } from "react";
import type { KeymapEntry } from "@densedash/core";
import { Footer } from "../ui/footer.js";
import { Keymap, useCommands } from "../ui/keymap.js";
import { Tabs } from "../ui/tabs.js";
import { Tree, useTree } from "../ui/tree.js";

const desks = [
  { id: "equities", label: "Equities" },
  { id: "fx", label: "Foreign exchange" },
  { id: "cash", label: "Cash" },
];
const views = [
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
] as const;

// The legend reads the live keymap. These two functions only choose what it shows and how
// entries pair up; the keys themselves still come from the preset.
const shown = new Set(["tree.next", "tree.prev", "tree.open"]);
const filter = (entry: KeymapEntry) =>
  !entry.command.startsWith("tree.") || shown.has(entry.command);
const groupBy = (entry: KeymapEntry) =>
  entry.command === "tree.next" || entry.command === "tree.prev" ? "desks" : entry.group;

function Desks() {
  const tree = useTree({
    data: desks,
    getRowId: (desk) => desk.id,
    getTextValue: (desk) => desk.label,
  });
  return (
    <Tree.Root tree={tree} aria-label="Desks">
      <Tree.Viewport tree={tree}>
        {(row) => <Tree.Row row={row}>{row.original.label}</Tree.Row>}
      </Tree.Viewport>
    </Tree.Root>
  );
}

function Shell() {
  const [mounted, setMounted] = useState(true);
  const [status, setStatus] = useState("updated 09:41");
  useCommands([{ id: "p-home", label: "home", run: () => setStatus("home opened") }]);
  return (
    <div data-slot="example-stack">
      <p>Focus the desks or the tabs: the footer lists the keys that answer there.</p>
      <button type="button" onClick={() => setMounted(!mounted)}>
        {mounted ? "Unmount desks" : "Mount desks"}
      </button>
      {mounted && <Desks />}
      <Tabs.Root items={views} label="detail tabs">
        <Tabs.List />
      </Tabs.Root>
      <Footer.Root>
        <Footer.Legend filter={filter} groupBy={groupBy} />
        <Footer.Status>{status}</Footer.Status>
      </Footer.Root>
    </div>
  );
}

export default function FooterExample() {
  return (
    <Keymap.Provider>
      <Shell />
    </Keymap.Provider>
  );
}
