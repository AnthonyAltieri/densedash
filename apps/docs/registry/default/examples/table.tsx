import { useStore } from "@densedash/react";
import { Cell } from "../docs/cell.js";
import { maxVolume, positionLimit, quotes } from "../docs/data.js";
import type { Quote } from "../docs/data.js";
import { Frame } from "../docs/frame.js";
import { Table, columns, useTable } from "../ui/table.js";

const col = columns<Quote>();
const fields = [
  col.accessor("name", { header: "Name" }),
  col.accessor("last", {
    header: "Last",
    numeric: true,
    width: "68px",
    format: (last) => <Cell.Price value={last} />,
  }),
  col.accessor("change", {
    header: "Change",
    numeric: true,
    width: "64px",
    sort: "desc",
    format: (change) => <Cell.Chip value={change} />,
  }),
  col.accessor("volume", {
    header: "Volume, M",
    numeric: true,
    width: "124px",
    sort: "desc",
    format: (volume) => <Cell.Bar value={volume} max={maxVolume} />,
  }),
  col.accessor("position", {
    header: "Net position",
    numeric: true,
    width: "116px",
    sort: "desc",
    format: (position) => <Cell.Diverging value={position} max={positionLimit} />,
  }),
];

export default function TableExample() {
  const table = useTable({
    data: quotes,
    getRowId: (quote) => quote.id,
    getSubRows: (quote) => quote.children, // desk › sector › instrument
    expanded: { defaultValue: { equities: true, ustech: true, europe: true } },
    highlighted: { defaultValue: "nvda" },
    columns: fields,
  });
  const { rows } = useStore(table.state);
  return (
    <Frame title="Quote board" count={rows.length} status={<Cell.DivergingKey />} variant="table">
      <Table.Root table={table} aria-label="Quote board">
        <Table.Viewport table={table} />
      </Table.Root>
    </Frame>
  );
}
