import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { columns, Keymap, Table, useStore, useTable } from "@densedash/react";
import type { TableHandle } from "@densedash/react";
import { tanstackVirtual } from "@densedash/plugin-tanstack-virtual";
import { badIdeas, createIdeas, groupBySector, nextTick, tick } from "./data.ts";
import type { Idea } from "./data.ts";

const sizes = [100, 1_000, 5_000] as const;
// Share the estimate and CSS row height so spacer geometry matches the rendered rows.
const rowHeight = 28;
const rowStyle = { "--dd-row-height": `${rowHeight}px` } as CSSProperties;

const column = columns<Idea>();
const money = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tone = (value: number) => (value < 0 ? "negative" : value > 0 ? "positive" : undefined);

// Ten columns. Numeric accessors type `format` with `number` and align to the end.
const ideaColumns = [
  column.accessor("symbol", { header: "Symbol", width: "minmax(0, 2fr)" }),
  column.accessor("side", { header: "Side" }),
  column.accessor("quantity", { header: "Qty", format: (quantity) => quantity.toLocaleString() }),
  column.accessor("price", { header: "Price", format: money }),
  column.cell(
    "notional",
    (idea) =>
      idea.price === undefined || idea.quantity === undefined
        ? undefined
        : idea.price * idea.quantity,
    { header: "Notional", format: money },
  ),
  column.accessor("pnl", {
    header: "P&L",
    format: (pnl) => <span className={tone(pnl)}>{money(pnl)}</span>,
  }),
  column.accessor("move", {
    header: "Move",
    format: (move) => <span className={tone(move)}>{`${move.toFixed(2)}%`}</span>,
  }),
  column.accessor("volume", { header: "Volume", format: (volume) => volume.toLocaleString() }),
  column.accessor("conviction", { header: "Conviction" }),
  column.accessor("updated", { header: "Updated", sort: false }),
];

const getChildren = (idea: Idea) => idea.children;
// Sectors start expanded; ids are stable across sizes.
const sectorKeys: ReadonlySet<string> = new Set(
  groupBySector(createIdeas(100)).map((group) => group.id),
);

function Status({ table, opened }: { table: TableHandle<Idea>; opened: string }) {
  const highlighted = useStore(table.state, (state) => state.highlighted);
  const rows = useStore(table.state, (state) => state.rows.length);
  const { sort, chosen } = useStore(table.sorting);
  return (
    <p className="status">
      {rows.toLocaleString()} visible rows · highlighted <strong>{highlighted ?? "none"}</strong> ·
      sort <strong>{sort === null ? "none" : `${sort.column} ${sort.direction}`}</strong> · chosen{" "}
      <strong>{chosen ?? "none"}</strong> · opened <strong>{opened}</strong>
    </p>
  );
}

function Ideas({
  ideas,
  grouped,
  virtualized,
}: {
  ideas: readonly Idea[];
  grouped: boolean;
  virtualized: boolean;
}) {
  const [virtualizer] = useState(() => tanstackVirtual({ estimateSize: () => rowHeight }));
  const [opened, setOpened] = useState("nothing yet");
  const table = useTable({
    roots: grouped ? groupBySector(ideas) : ideas,
    columns: ideaColumns,
    getKey: (idea) => idea.id,
    getTextValue: (idea) => idea.symbol,
    ...(grouped ? { getChildren, expanded: { defaultValue: sectorKeys } } : {}),
    onOpen: (idea) => setOpened(idea.symbol),
  });
  return (
    <>
      <Status table={table} opened={opened} />
      <Table.Root table={table} aria-label="Ideas" className="table" style={rowStyle}>
        <Table.Header />
        <Table.Viewport
          table={table}
          className="viewport"
          virtualizer={virtualized ? virtualizer : undefined}
        />
      </Table.Root>
    </>
  );
}

export function App() {
  const [size, setSize] = useState<number>(1_000);
  const [ideas, setIdeas] = useState(() => createIdeas(1_000));
  const [grouped, setGrouped] = useState(true);
  const [virtualized, setVirtualized] = useState(true);
  const [live, setLive] = useState(false);

  const addTick = () => {
    const ticks = nextTick();
    setIdeas((current) => tick(current, ticks));
  };

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(addTick, 500);
    return () => clearInterval(timer);
  }, [live]);

  return (
    <Keymap.Scope name="page" page render={<main />}>
      <header>
        <h1>densedash table</h1>
        <div className="controls">
          <label>
            Rows{" "}
            <select
              value={size}
              onChange={(event) => {
                const next = Number(event.target.value);
                setSize(next);
                setIdeas(createIdeas(next));
              }}
            >
              {sizes.map((option) => (
                <option key={option} value={option}>
                  {option.toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rows nest{" "}
            <select
              value={grouped ? "sector" : "flat"}
              onChange={(event) => setGrouped(event.target.value === "sector")}
            >
              <option value="sector">By sector (treegrid)</option>
              <option value="flat">Flat (grid)</option>
            </select>
          </label>
          <label>
            Viewport{" "}
            <select
              value={virtualized ? "virtualized" : "all"}
              onChange={(event) => setVirtualized(event.target.value === "virtualized")}
            >
              <option value="virtualized">Virtualized</option>
              <option value="all">All rows</option>
            </select>
          </label>
          <button type="button" aria-pressed={live} onClick={() => setLive((on) => !on)}>
            Live feed {live ? "on" : "off"}
          </button>
          <button type="button" onClick={addTick}>
            Add tick
          </button>
          <button
            type="button"
            onClick={() => {
              const bad = badIdeas(nextTick());
              setIdeas((current) => [...bad, ...current]);
            }}
          >
            Feed bad rows
          </button>
        </div>
      </header>
      <section aria-label="Ideas">
        <Ideas ideas={ideas} grouped={grouped} virtualized={virtualized} />
      </section>
      <footer>
        <Keymap.Legend />
      </footer>
    </Keymap.Scope>
  );
}
