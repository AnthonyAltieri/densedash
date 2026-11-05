import { useState } from "react";
import { Keymap } from "../ui/keymap.js";
import { Tree, useTree } from "../ui/tree.js";

interface Desk {
  id: string;
  label: string;
  children?: Desk[];
}
const items: Desk[] = [
  {
    id: "equities",
    label: "Equities",
    children: [
      { id: "aapl", label: "AAPL · Apple" },
      { id: "msft", label: "MSFT · Microsoft" },
    ],
  },
  { id: "fx", label: "Foreign exchange", children: [{ id: "eur", label: "EUR / USD" }] },
  { id: "cash", label: "Cash" },
];

function Explorer() {
  const [opened, setOpened] = useState("Nothing opened");
  const tree = useTree({
    data: items,
    getRowId: (item) => item.id,
    getSubRows: (item) => item.children,
    getTextValue: (item) => item.label,
    expanded: { defaultValue: { equities: true } },
    onOpen: (item) => setOpened(item.label),
  });
  return (
    <div data-slot="example-stack">
      <Tree.Root tree={tree} aria-label="Trading desks">
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
      <output>{opened}</output>
    </div>
  );
}

export default function TreeExample() {
  return (
    <Keymap.Provider>
      <Explorer />
    </Keymap.Provider>
  );
}
