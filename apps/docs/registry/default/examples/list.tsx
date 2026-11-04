import { Keymap } from "../ui/keymap.js";
import { List, useList } from "../ui/list.js";

const items = [
  { id: "inbox", label: "Inbox · 12 pending" },
  { id: "review", label: "Review · 4 orders" },
  { id: "archive", label: "Archive · 128 settled" },
];

function Queue() {
  const list = useList({
    roots: items,
    getKey: (item) => item.id,
    getTextValue: (item) => item.label,
  });
  return (
    <List.Root tree={list} aria-label="Order queues">
      <List.Viewport tree={list}>
        {(row) => <List.Row row={row}>{row.item.label}</List.Row>}
      </List.Viewport>
    </List.Root>
  );
}

export default function ListExample() {
  return (
    <Keymap.Provider>
      <Queue />
    </Keymap.Provider>
  );
}
