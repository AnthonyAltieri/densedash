/** A book of portfolios, accounts and positions. */
export interface Holding {
  readonly id: string;
  readonly name: string;
  readonly kind: "portfolio" | "account" | "position" | "fill";
  readonly value: number;
  readonly children?: readonly Holding[];
}

export interface Instrument {
  readonly ticker: string;
  readonly company: string;
  readonly halted: boolean;
}

const portfolios = [
  "Aurora",
  "Birch",
  "Cedar",
  "Delta",
  "Ember",
  "Fjord",
  "Granite",
  "Iris",
  "Maple",
  "Nimbus",
  "Orion",
  "Pine",
  "Quartz",
  "Raven",
  "Sierra",
  "Tundra",
  "Umber",
  "Vega",
  "Willow",
  "Zephyr",
];
const accounts = ["Cash", "Margin", "Options", "Futures", "Swaps", "Treasury", "Credit", "Rates"];
const tickers = [
  "AAPL",
  "AMZN",
  "BRK.B",
  "COST",
  "CVX",
  "GOOG",
  "IBM",
  "MSFT",
  "NVDA",
  "ORCL",
  "PEP",
  "QCOM",
  "TSLA",
  "UNH",
  "V",
  "WMT",
  "XOM",
];

// Deterministic values, so screenshots and timings compare across runs.
const value = (index: number) => ((index * 7919) % 100_000) + 0.25;

/** Exactly `size` rows when every portfolio and account is expanded. */
export function createBook(size: number): Holding[] {
  const book: Holding[] = [];
  let rows = 0;
  for (let p = 0; rows < size; p++) {
    rows++;
    const portfolio: Holding[] = [];
    for (let a = 0; a < accounts.length && rows < size; a++) {
      rows++;
      const positions: Holding[] = [];
      for (let t = 0; t < tickers.length && rows < size; t++) {
        rows++;
        positions.push({
          id: `p${p}-a${a}-${tickers[t]}`,
          name: tickers[t]!,
          kind: "position",
          value: value(rows),
        });
      }
      portfolio.push({
        id: `p${p}-a${a}`,
        name: accounts[a]!,
        kind: "account",
        value: value(rows),
        children: positions,
      });
    }
    book.push({
      id: `p${p}`,
      name: `${portfolios[p % portfolios.length]} ${Math.floor(p / portfolios.length) + 1}`,
      kind: "portfolio",
      value: value(rows),
      children: portfolio,
    });
  }
  return book;
}

/** Keys of every row that has children. */
export function parentKeys(book: readonly Holding[]): Set<string> {
  const keys = new Set<string>();
  const stack = [...book];
  while (stack.length > 0) {
    const holding = stack.pop()!;
    if (holding.children !== undefined && holding.children.length > 0) {
      keys.add(holding.id);
      stack.push(...holding.children);
    }
  }
  return keys;
}

let fills = 0;

/** A new fill at the top of the book, as a live feed would add it. */
export function createFill(): Holding {
  fills++;
  const ticker = tickers[fills % tickers.length]!;
  return {
    id: `fill-${fills}`,
    name: `Fill ${fills} · ${ticker}`,
    kind: "fill",
    value: value(fills),
  };
}

export const instruments: readonly Instrument[] = tickers.map((ticker, index) => ({
  ticker,
  company: `${ticker} Inc.`,
  halted: index % 6 === 5,
}));
