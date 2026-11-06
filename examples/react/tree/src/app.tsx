import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Keymap, List, Tree, tanstackVirtual, useList, useStore, useTree } from "@densedash/react";
import type { ExpandedState } from "@densedash/core";
import type { TreeHandle } from "@densedash/react";
import { createBook, createFill, expandParents, instruments } from "./data.ts";
import type { Holding } from "./data.ts";

const sizes = [100, 1_000, 5_000, 50_000] as const;
// "virtual" is the built-in strategy; "custom" passes a strategy through `virtualizer`.
type Mode = "all" | "virtual" | "custom";

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
  mode,
  mixed,
}: {
  book: readonly Holding[];
  expanded: ExpandedState;
  onExpandedChange: (expanded: ExpandedState) => void;
  mode: Mode;
  mixed: boolean;
}) {
  // A custom strategy: here the built-in one, created once and passed through `virtualizer`.
  const [custom] = useState(() => tanstackVirtual({ overscan: 4 }));
  const [opened, setOpened] = useState("nothing yet");
  const tree = useTree({
    data: book,
    getRowId: (holding) => holding.id,
    getSubRows: (holding) => holding.children,
    getTextValue: (holding) => holding.name,
    expanded: { value: expanded, onChange: onExpandedChange },
    onOpen: (holding) => setOpened(holding.name),
  });
  return (
    <>
      <Status tree={tree} opened={opened} />
      <Tree.Root tree={tree} aria-label="Book" className="tree">
        {/* Taller portfolio rows ("Mixed") are measured as they render. */}
        <Tree.Viewport
          tree={tree}
          className="viewport"
          virtual={mode === "virtual"}
          virtualizer={mode === "custom" ? custom : undefined}
        >
          {(row) => (
            <Tree.Row row={row} className={mixed && row.depth === 0 ? "tall" : undefined}>
              <Tree.Indent />
              <Tree.Toggle />
              <span className="name">{row.original.name}</span>
              <span className="value">{row.original.value.toFixed(2)}</span>
            </Tree.Row>
          )}
        </Tree.Viewport>
      </Tree.Root>
    </>
  );
}

function Watchlist({ virtualized }: { virtualized: boolean }) {
  const [opened, setOpened] = useState("nothing yet");
  const list = useList({
    data: instruments,
    getRowId: (instrument) => instrument.ticker,
    isDisabled: (instrument) => instrument.halted,
    onOpen: (instrument) => setOpened(instrument.company),
  });
  return (
    <>
      <p className="status">
        Opened <strong>{opened}</strong>
      </p>
      <List.Root tree={list} aria-label="Watchlist" className="tree">
        <List.Viewport tree={list} className="viewport" virtual={virtualized}>
          {(row) => (
            <List.Row row={row}>
              <span className="name">{row.original.ticker}</span>
              <span className="value">{row.original.halted ? "halted" : row.original.company}</span>
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
  const [expanded, setExpanded] = useState<ExpandedState>(() => expandParents(book));
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<Mode>("all");
  const [mixed, setMixed] = useState(false);
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
    setExpanded(expandParents(fresh));
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
            <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
              <option value="all">All rows</option>
              <option value="virtual">Virtualized (virtual)</option>
              <option value="custom">Custom virtualizer</option>
            </select>
          </label>
          <label>
            Row heights{" "}
            <select
              value={mixed ? "mixed" : "uniform"}
              onChange={(event) => setMixed(event.target.value === "mixed")}
            >
              <option value="uniform">Uniform</option>
              <option value="mixed">Mixed</option>
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
              mode={mode}
              mixed={mixed}
            />
          </Boundary>
        </section>
        <section aria-label="Watchlist">
          <Watchlist virtualized={mode !== "all"} />
        </section>
      </div>
      <footer>
        <Keymap.Legend />
      </footer>
    </Keymap.Scope>
  );
}
