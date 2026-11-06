import { Keymap } from "../ui/keymap.js";
import { Table, columns, useTable } from "../ui/table.js";

const items = [
  { symbol: "AAPL", quantity: 120, pnl: 842.5 },
  { symbol: "MSFT", quantity: 80, pnl: -126.75 },
  { symbol: "NVDA", quantity: 240, pnl: 1640 },
];
const col = columns<(typeof items)[number]>();
const fields = [
  col.accessor("symbol", { header: "Symbol" }),
  col.accessor("quantity", { header: "Qty", numeric: true }),
  col.accessor("pnl", { header: "P&L", numeric: true, format: (value) => value.toFixed(2) }),
];

function Positions() {
  const table = useTable({ data: items, getRowId: (item) => item.symbol, columns: fields });
  return (
    <Table.Root table={table} aria-label="Open positions">
      <Table.Viewport table={table} />
    </Table.Root>
  );
}

export default function TableExample() {
  return (
    <Keymap.Provider>
      <Positions />
    </Keymap.Provider>
  );
}
