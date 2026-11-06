import { useState } from "react";
import { Keymap } from "../ui/keymap.js";
import { Table, columns, useTable } from "../ui/table.js";

interface Position {
  symbol: string;
  quantity: number;
  pnl: number;
}
const sample: Position[] = [
  { symbol: "AAPL", quantity: 120, pnl: 842.5 },
  { symbol: "MSFT", quantity: 80, pnl: -126.75 },
  { symbol: "NVDA", quantity: 240, pnl: 1640 },
];
// A generated book for the large size; the same every time.
const generate = (count: number): Position[] =>
  Array.from({ length: count }, (_, index) => ({
    symbol: `SYM${String(index + 1).padStart(5, "0")}`,
    quantity: ((index * 37) % 500) + 10,
    pnl: (((index * 7919) % 4001) - 2000) / 4,
  }));
const sizes = [3, 10_000] as const;

const col = columns<Position>();
const fields = [
  col.accessor("symbol", { header: "Symbol" }),
  col.accessor("quantity", { header: "Qty", numeric: true }),
  col.accessor("pnl", { header: "P&L", numeric: true, format: (value) => value.toFixed(2) }),
];

function Positions() {
  const [items, setItems] = useState(sample);
  const table = useTable({ data: items, getRowId: (item) => item.symbol, columns: fields });
  return (
    <div data-slot="example-stack">
      <label>
        Rows{" "}
        <select
          value={items.length}
          onChange={(event) => {
            const size = Number(event.target.value);
            setItems(size === sample.length ? sample : generate(size));
          }}
        >
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size.toLocaleString("en-US")}
            </option>
          ))}
        </select>
      </label>
      <Table.Root table={table} aria-label="Open positions">
        {/* `virtual` mounts only the rows in view; the viewport needs a bounded height. */}
        <Table.Viewport
          table={table}
          virtual
          style={{ maxBlockSize: "calc(var(--dd-row-height) * 12)" }}
        />
      </Table.Root>
    </div>
  );
}

export default function TableExample() {
  return (
    <Keymap.Provider>
      <Positions />
    </Keymap.Provider>
  );
}
