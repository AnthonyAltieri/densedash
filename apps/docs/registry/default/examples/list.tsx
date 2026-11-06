import { useState } from "react";
import { useStore } from "@densedash/react";
import { Cell } from "../docs/cell.js";
import { ideas, queues } from "../docs/data.js";
import { Frame } from "../docs/frame.js";
import { List, useList } from "../ui/list.js";

function Queues() {
  const [opened, setOpened] = useState("Nothing opened");
  const list = useList({
    data: queues,
    getRowId: (queue) => queue.id,
    getTextValue: (queue) => queue.name,
    highlighted: { defaultValue: "review" },
    onOpen: (queue) => setOpened(`Opened ${queue.name}`),
  });
  return (
    <Frame title="Order queues" count={queues.length} status={opened} variant="list">
      <List.Root tree={list} aria-label="Order queues">
        <List.Viewport tree={list}>
          {(row) => (
            <List.Row row={row}>
              <Cell.Name>{row.original.name}</Cell.Name>
              <Cell.Note>{row.original.note}</Cell.Note>
              <Cell.Count value={row.original.count} />
            </List.Row>
          )}
        </List.Viewport>
      </List.Root>
    </Frame>
  );
}

// getSubRows nests the list: ideas › runs › folds.
function Ideas() {
  const list = useList({
    data: ideas,
    getRowId: (item) => item.id,
    getSubRows: (item) => item.runs ?? item.folds,
    getTextValue: (item) => item.name,
    expanded: { defaultValue: { carry: true, "carry-14": true } },
    highlighted: { defaultValue: "carry-14-2" },
  });
  const { rows } = useStore(list.state);
  return (
    <Frame title="Ideas" count={rows.length} status="idea › run › fold" variant="nested-list">
      <List.Root tree={list} aria-label="Ideas, runs and folds">
        <List.Viewport tree={list}>
          {(row) => (
            <List.Row row={row}>
              <List.Indent />
              <List.Toggle />
              <Cell.Name>{row.original.name}</Cell.Name>
              <Cell.Note>{row.original.note}</Cell.Note>
              <Cell.Tag value={row.original.stage} />
              <Cell.Change value={row.original.return} />
            </List.Row>
          )}
        </List.Viewport>
      </List.Root>
    </Frame>
  );
}

export default function ListExample() {
  return (
    <>
      <Queues />
      <Ideas />
    </>
  );
}
