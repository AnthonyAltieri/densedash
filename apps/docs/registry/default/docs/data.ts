// Docs-only sample data shared by the examples. Not part of the registry.
// Values come from the example boards on the design canvas.

/**
 * A row of the desks tree: a desk or a sector has `children`; an instrument has a ticker and
 * prices. Cash is a desk with a balance and no children.
 */
export interface Desk {
  readonly id: string;
  /** The desk or sector name, or the instrument's full name. */
  readonly name: string;
  /** The instrument's ticker or pair. */
  readonly code?: string;
  /** Last price, or a desk's balance. */
  readonly last?: number;
  /** Decimal places for `last`; defaults to 2. */
  readonly digits?: number;
  /** Change since the previous close, in percent. */
  readonly change?: number;
  /** Volume traded today, in millions. */
  readonly volume?: number;
  /** Net position: positive is long, negative is short. */
  readonly position?: number;
  readonly children?: readonly Desk[];
}

const instrument = (
  code: string,
  name: string,
  last: number,
  change: number,
  volume: number,
  position: number,
  digits?: number,
): Desk => ({
  id: code.toLowerCase().replaceAll(/[^a-z0-9]/g, ""),
  code,
  name,
  last,
  change,
  volume,
  position,
  ...(digits === undefined ? {} : { digits }),
});

/** Desks › sectors › instruments. */
export const desks: readonly Desk[] = [
  {
    id: "equities",
    name: "Equities",
    children: [
      {
        id: "ustech",
        name: "US technology",
        children: [
          instrument("AAPL", "Apple", 227.48, 1.24, 48.2, 120),
          instrument("MSFT", "Microsoft", 431.1, -0.38, 19.6, 80),
          instrument("NVDA", "Nvidia", 138.07, 2.91, 212.4, 240),
          instrument("TSLA", "Tesla", 248.5, -1.86, 96.1, -60),
        ],
      },
      {
        id: "europe",
        name: "Europe",
        children: [
          instrument("ASML", "ASML Holding", 672.4, 0.85, 1.3, 40),
          instrument("SAP", "SAP", 218.95, -0.21, 0.9, -150),
        ],
      },
      {
        id: "financials",
        name: "Financials",
        children: [
          instrument("JPM", "JPMorgan Chase", 221.3, 0.52, 8.7, 200),
          instrument("GS", "Goldman Sachs", 512.8, -0.44, 2.1, -90),
        ],
      },
    ],
  },
  {
    id: "energy",
    name: "Energy",
    children: [
      {
        id: "majors",
        name: "Majors",
        children: [
          instrument("XOM", "Exxon Mobil", 117.6, -0.74, 14.8, 300),
          instrument("CVX", "Chevron", 151.2, -0.31, 7.4, -120),
        ],
      },
    ],
  },
  {
    id: "fx",
    name: "Foreign exchange",
    children: [
      {
        id: "g10",
        name: "G10",
        children: [
          instrument("EUR/USD", "Euro", 1.0842, -0.12, 96.4, 150, 4),
          instrument("USD/JPY", "Yen", 152.31, 0.44, 58.2, -80),
        ],
      },
    ],
  },
  {
    id: "rates",
    name: "Rates",
    children: [
      {
        id: "treasuries",
        name: "Treasuries",
        children: [instrument("UST 10Y", "Treasury", 4.28, 0.03, 24.6, 110)],
      },
    ],
  },
  { id: "cash", name: "Cash", last: 1_204_300, digits: 0 },
];

/**
 * The tree page's desks: fewer instruments than `desks`, as the tree board draws them. Rates
 * holds its one instrument directly.
 */
export const deskTree: readonly Desk[] = [
  {
    id: "equities",
    name: "Equities",
    children: [
      {
        id: "ustech",
        name: "US technology",
        children: [
          instrument("AAPL", "Apple", 227.48, 1.24, 48.2, 120),
          instrument("MSFT", "Microsoft", 431.1, -0.38, 19.6, 80),
          instrument("NVDA", "Nvidia", 138.07, 2.91, 212.4, 240),
        ],
      },
      {
        id: "europe",
        name: "Europe",
        children: [
          instrument("ASML", "ASML Holding", 672.4, 0.85, 1.3, 40),
          instrument("SAP", "SAP", 218.95, -0.21, 0.9, -150),
        ],
      },
    ],
  },
  {
    id: "fx",
    name: "Foreign exchange",
    children: [
      {
        id: "g10",
        name: "G10",
        children: [
          instrument("EUR/USD", "Euro", 1.0842, -0.12, 96.4, 150, 4),
          instrument("USD/JPY", "Yen", 152.31, 0.44, 58.2, -80),
        ],
      },
    ],
  },
  {
    id: "rates",
    name: "Rates",
    children: [instrument("UST 10Y", "Treasury", 4.28, 0.03, 24.6, 110)],
  },
  { id: "cash", name: "Cash", last: 1_204_300, digits: 0 },
];

/** The scale for volume bars, in millions. */
export const maxVolume = 400;
/** The net position limit each way, the scale for position bars. */
export const positionLimit = 400;

/** The instruments under a row, or the row itself when it is one. */
export function instrumentsOf(row: Desk): Desk[] {
  if (row.children === undefined) return row.code === undefined ? [] : [row];
  return row.children.flatMap(instrumentsOf);
}

export interface Totals {
  /** Mean change of the instruments, in percent. */
  readonly change: number;
  readonly volume: number;
  readonly position: number;
}

/** A group row's totals: mean change, summed volume and summed net position. */
export function totalsOf(row: Desk): Totals {
  const instruments = instrumentsOf(row);
  const sum = (field: "change" | "volume" | "position") =>
    instruments.reduce((total, item) => total + (item[field] ?? 0), 0);
  return {
    change: instruments.length === 0 ? 0 : sum("change") / instruments.length,
    volume: sum("volume"),
    position: sum("position"),
  };
}

/**
 * A row of the quote board: a desk or a sector carries its instruments' totals and has
 * `children`; an instrument is named by its ticker and has a last price.
 */
export interface Quote {
  readonly id: string;
  /** The desk or sector name, or the instrument's ticker. */
  readonly name: string;
  /** Last price; groups have none. */
  readonly last?: number;
  /** Change in percent; a group's is its instruments' mean. */
  readonly change: number;
  /** Volume in millions; a group's is its instruments' sum. */
  readonly volume: number;
  /** Net position; a group's is its instruments' sum. */
  readonly position: number;
  readonly children?: readonly Quote[];
}

function quoteOf(row: Desk): Quote {
  const totals = totalsOf(row);
  if (row.children === undefined) {
    return {
      id: row.id,
      name: row.code ?? row.name,
      ...totals,
      ...(row.last === undefined ? {} : { last: row.last }),
    };
  }
  return { id: row.id, name: row.name, ...totals, children: row.children.map(quoteOf) };
}

/** The equities and energy desks as quote rows: desk › sector › instrument, with group totals. */
export const quotes: readonly Quote[] = desks
  .filter((desk) => desk.id === "equities" || desk.id === "energy")
  .map(quoteOf);

/** An order queue: a flat list. */
export interface Queue {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly count: number;
}

export const queues: readonly Queue[] = [
  { id: "inbox", name: "Inbox", note: "pending", count: 12 },
  { id: "review", name: "Review", note: "orders awaiting sign-off", count: 4 },
  { id: "working", name: "Working", note: "live at the venue", count: 7 },
  { id: "fills", name: "Fills", note: "today", count: 31 },
  { id: "rejected", name: "Rejected", note: "needs a look", count: 2 },
  { id: "archive", name: "Archive", note: "settled", count: 128 },
];

/** How far an idea has gone. */
export type Stage = "Live" | "Paper" | "Draft";

/** Ideas › runs › folds: an idea has a stage and runs; a run has a return and folds. */
export interface Idea {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly stage?: Stage;
  /** Return over the run or fold, in percent. */
  readonly return?: number;
  readonly runs?: readonly Idea[];
  readonly folds?: readonly Idea[];
}

export const ideas: readonly Idea[] = [
  {
    id: "carry",
    name: "Funding carry",
    note: "3 runs",
    stage: "Live",
    runs: [
      {
        id: "carry-14",
        name: "Run 14",
        note: "90 days · 3 folds",
        return: 2.4,
        folds: [
          { id: "carry-14-1", name: "Fold 1", note: "Jan to Mar", return: 1.9 },
          { id: "carry-14-2", name: "Fold 2", note: "Apr to Jun", return: 3.6 },
          { id: "carry-14-3", name: "Fold 3", note: "Jul to Sep", return: -0.7 },
        ],
      },
      {
        id: "carry-13",
        name: "Run 13",
        note: "60 days · 2 folds",
        return: 1.1,
        folds: [
          { id: "carry-13-1", name: "Fold 1", note: "Jan to Feb", return: 0.8 },
          { id: "carry-13-2", name: "Fold 2", note: "Mar to Apr", return: 1.4 },
        ],
      },
      { id: "carry-12", name: "Run 12", note: "60 days · no folds", return: -0.8 },
    ],
  },
  {
    id: "momentum",
    name: "Momentum",
    note: "2 runs",
    stage: "Paper",
    runs: [
      { id: "momentum-3", name: "Run 3", note: "90 days", return: 2.1 },
      { id: "momentum-2", name: "Run 2", note: "90 days", return: -1.3 },
    ],
  },
  {
    id: "basis",
    name: "Basis reversion",
    note: "1 run",
    stage: "Paper",
    runs: [{ id: "basis-1", name: "Run 1", note: "30 days", return: 0.4 }],
  },
  { id: "pairs", name: "Pairs", note: "no runs yet", stage: "Draft" },
];
