import { Keymap } from "../ui/keymap.js";
import { List, useList } from "../ui/list.js";

const items = [
  { id: "inbox", label: "Inbox · 12 pending" },
  { id: "review", label: "Review · 4 orders" },
  { id: "archive", label: "Archive · 128 settled" },
];

interface Idea {
  id: string;
  label: string;
  runs?: Idea[];
}
const ideas: Idea[] = [
  {
    id: "momentum",
    label: "Momentum · 2 runs",
    runs: [
      { id: "momentum-1", label: "Run 1 · +2.4%" },
      { id: "momentum-2", label: "Run 2 · −0.8%" },
    ],
  },
  { id: "carry", label: "Carry · 1 run", runs: [{ id: "carry-1", label: "Run 1 · +1.1%" }] },
  { id: "pairs", label: "Pairs · no runs" },
];

function Queue() {
  const list = useList({
    data: items,
    getRowId: (item) => item.id,
    getTextValue: (item) => item.label,
  });
  return (
    <List.Root tree={list} aria-label="Order queues">
      <List.Viewport tree={list}>
        {(row) => <List.Row row={row}>{row.original.label}</List.Row>}
      </List.Viewport>
    </List.Root>
  );
}

// getSubRows nests the list: next and previous step through expanded runs.
function Runs() {
  const list = useList({
    data: ideas,
    getRowId: (idea) => idea.id,
    getSubRows: (idea) => idea.runs,
    getTextValue: (idea) => idea.label,
    expanded: { defaultValue: { momentum: true } },
  });
  return (
    <List.Root tree={list} aria-label="Ideas and runs">
      <List.Viewport tree={list}>
        {(row) => (
          <List.Row row={row}>
            <List.Indent />
            <List.Toggle />
            {row.original.label}
          </List.Row>
        )}
      </List.Viewport>
    </List.Root>
  );
}

export default function ListExample() {
  return (
    <Keymap.Provider>
      <div data-slot="example-stack">
        <Queue />
        <Runs />
      </div>
    </Keymap.Provider>
  );
}
