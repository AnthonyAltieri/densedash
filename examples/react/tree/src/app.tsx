import { Component, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Keymap, List, Tree, useList, useStore, useTree } from "@densedash/react";
import { tanstackVirtual } from "@densedash/plugin-tanstack-virtual";
import type { TreeHandle } from "@densedash/react";
import { createBook, createFill, instruments, parentKeys } from "./data.ts";
import type { Holding } from "./data.ts";

const sizes = [100, 1_000, 5_000, 50_000] as const;
// Share the estimate and CSS row height so spacer geometry matches the rendered rows.
const rowHeight = 28;
const rowStyle = { "--dd-row-height": `${rowHeight}px` } as CSSProperties;

function Status({ tree, opened }: { tree: TreeHandle<Holding>; opened: string }) {
  const highlighted = useStore(tree.state, (state) => state.highlighted);
  const rows = useStore(tree.state, (state) => state.rows.length);
  return (
    <p className="status">
      {rows.toLocaleString()} rows · highlighted <strong>{highlighted ?? "none"}</strong> · opened{" "}
      <strong>{opened}</strong>
    </p>
  );
}

function Book({
  book,
  expanded,
  onExpandedChange,
  virtualized,
}: {
  book: readonly Holding[];
  expanded: ReadonlySet<string>;
  onExpandedChange: (expanded: ReadonlySet<string>) => void;
  virtualized: boolean;
}) {
  const [virtualizer] = useState(() => tanstackVirtual({ estimateSize: () => rowHeight }));
  const [opened, setOpened] = useState("nothing yet");
  const tree = useTree({
    roots: book,
    getKey: (holding) => holding.id,
    getChildren: (holding) => holding.children,
    getTextValue: (holding) => holding.name,
    expanded: { value: expanded, onChange: onExpandedChange },
    onOpen: (holding) => setOpened(holding.name),
  });
  return (
    <>
      <Status tree={tree} opened={opened} />
      <Tree.Root tree={tree} aria-label="Book" className="tree" style={rowStyle}>
        <Tree.Viewport
          tree={tree}
          className="viewport"
          virtualizer={virtualized ? virtualizer : undefined}
        >
          {(row) => (
            <Tree.Row row={row}>
              <Tree.Indent />
              <Tree.Toggle />
              <span className="name">{row.item.name}</span>
              <span className="value">{row.item.value.toFixed(2)}</span>
            </Tree.Row>
          )}
        </Tree.Viewport>
      </Tree.Root>
    </>
  );
}

function Watchlist({ virtualized }: { virtualized: boolean }) {
  const [virtualizer] = useState(() => tanstackVirtual({ estimateSize: () => rowHeight }));
  const [opened, setOpened] = useState("nothing yet");
  const list = useList({
    roots: instruments,
    getKey: (instrument) => instrument.ticker,
    isDisabled: (instrument) => instrument.halted,
    onOpen: (instrument) => setOpened(instrument.company),
  });
  return (
    <>
      <p className="status">
        Opened <strong>{opened}</strong>
      </p>
      <List.Root tree={list} aria-label="Watchlist" className="tree" style={rowStyle}>
        <List.Viewport
          tree={list}
          className="viewport"
          virtualizer={virtualized ? virtualizer : undefined}
        >
          {(row) => (
            <List.Row row={row}>
              <span className="name">{row.item.ticker}</span>
              <span className="value">{row.item.halted ? "halted" : row.item.company}</span>
            </List.Row>
          )}
        </List.Viewport>
      </List.Root>
    </>
  );
}

class Boundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <div role="alert" className="error">
        <p>{this.state.error.message}</p>
        <button type="button" onClick={this.props.onReset}>
          Reset data
        </button>
      </div>
    );
  }
}

export function App() {
  const [size, setSize] = useState<number>(1_000);
  const [book, setBook] = useState(() => createBook(1_000));
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => parentKeys(book));
  const [live, setLive] = useState(false);
  const [virtualized, setVirtualized] = useState(false);
  const [resets, setResets] = useState(0);

  // Create the fill outside the updater, which StrictMode runs twice.
  const addFill = () => {
    const fill = createFill();
    setBook((current) => [fill, ...current]);
  };

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(addFill, 1_000);
    return () => clearInterval(timer);
  }, [live]);

  const load = (next: number) => {
    const fresh = createBook(next);
    setSize(next);
    setBook(fresh);
    setExpanded(parentKeys(fresh));
  };

  return (
    <Keymap.Scope name="page" page render={<main />}>
      <header>
        <h1>densedash tree</h1>
        <div className="controls">
          <label>
            Rows{" "}
            <select value={size} onChange={(event) => load(Number(event.target.value))}>
              {sizes.map((option) => (
                <option key={option} value={option}>
                  {option.toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Viewport{" "}
            <select
              value={virtualized ? "virtualized" : "all"}
              onChange={(event) => setVirtualized(event.target.value === "virtualized")}
            >
              <option value="all">All rows</option>
              <option value="virtualized">Virtualized</option>
            </select>
          </label>
          <button type="button" aria-pressed={live} onClick={() => setLive((on) => !on)}>
            Live feed {live ? "on" : "off"}
          </button>
          <button type="button" onClick={addFill}>
            Add fill
          </button>
          <button
            type="button"
            onClick={() => setBook((current) => [...current, { ...current[0]!, name: "Copy" }])}
          >
            Feed a duplicate key
          </button>
        </div>
      </header>
      <div className="panes">
        <section aria-label="Book">
          <Boundary
            key={resets}
            onReset={() => {
              load(size);
              setResets((count) => count + 1);
            }}
          >
            <Book
              book={book}
              expanded={expanded}
              onExpandedChange={setExpanded}
              virtualized={virtualized}
            />
          </Boundary>
        </section>
        <section aria-label="Watchlist">
          <Watchlist virtualized={virtualized} />
        </section>
      </div>
      <footer>
        <Keymap.Legend />
      </footer>
    </Keymap.Scope>
  );
}
