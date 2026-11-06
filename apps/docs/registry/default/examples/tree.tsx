import { useState } from "react";
import { useStore } from "@densedash/react";
import { Cell } from "../docs/cell.js";
import { deskTree, instrumentsOf } from "../docs/data.js";
import { Frame } from "../docs/frame.js";
import { Tree, useTree } from "../ui/tree.js";

export default function TreeExample() {
  const [opened, setOpened] = useState("Nothing opened");
  const tree = useTree({
    data: deskTree,
    getRowId: (desk) => desk.id,
    getSubRows: (desk) => desk.children,
    expanded: { defaultValue: { equities: true, ustech: true } },
    highlighted: { defaultValue: "msft" },
    onOpen: (desk) => setOpened(`Opened ${desk.code ?? desk.name}`),
  });
  const { rows } = useStore(tree.state);
  return (
    <Frame title="Desks" count={rows.length} status={opened} variant="tree">
      <Tree.Root tree={tree} aria-label="Desks">
        <Tree.Viewport tree={tree}>
          {(row) => (
            <Tree.Row row={row}>
              <Tree.Indent />
              <Tree.Toggle />
              <Cell.Code>{row.original.code}</Cell.Code>
              <Cell.Name>{row.original.name}</Cell.Name>
              {row.getCanExpand() ? (
                <Cell.Total value={instrumentsOf(row.original).length} unit="open" />
              ) : (
                <Cell.Price value={row.original.last} digits={row.original.digits} />
              )}
              <Cell.Change value={row.original.change} />
            </Tree.Row>
          )}
        </Tree.Viewport>
      </Tree.Root>
    </Frame>
  );
}
