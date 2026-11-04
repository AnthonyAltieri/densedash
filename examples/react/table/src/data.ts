/** A trading idea; sector group rows carry only the totals they can sum. */
export interface Idea {
  readonly id: string;
  readonly symbol: string;
  readonly sector: string;
  readonly side?: "Long" | "Short";
  readonly quantity?: number;
  readonly price?: number;
  readonly pnl?: number;
  readonly move?: number;
  readonly volume?: number;
  readonly conviction?: "Low" | "Medium" | "High";
  readonly updated?: string;
  readonly children?: readonly Idea[];
}

const sectors = [
  "Energy",
  "Materials",
  "Industrials",
  "Utilities",
  "Healthcare",
  "Financials",
  "Consumer",
  "Technology",
  "Communication",
  "Real estate",
];
const tickers = [
  "AAPL",
  "AMZN",
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
  "WMT",
  "XOM",
];
const convictions = ["Low", "Medium", "High"] as const;

// Deterministic values, so screenshots and timings compare across runs.
const hash = (index: number) => (index * 7919) % 10_007;

function idea(index: number, sector: string): Idea {
  const h = hash(index + 1);
  const price = 10 + (h % 4_000) / 10;
  const quantity = 10 * (1 + (h % 90));
  const move = ((h % 2_001) - 1_000) / 100;
  return {
    id: `idea-${index}`,
    symbol: `${tickers[index % tickers.length]}.${Math.floor(index / tickers.length) + 1}`,
    sector,
    side: h % 3 === 0 ? "Short" : "Long",
    quantity,
    price,
    pnl: Math.round(price * quantity * move) / 100,
    move,
    volume: 1_000 * (1 + (h % 500)),
    conviction: convictions[h % convictions.length]!,
    updated: `09:${String(30 + (h % 30)).padStart(2, "0")}:${String(h % 60).padStart(2, "0")}`,
  };
}

/** `size` ideas, flat. */
export function createIdeas(size: number): Idea[] {
  return Array.from({ length: size }, (_, index) => idea(index, sectors[index % sectors.length]!));
}

/** The same ideas grouped by sector; each group row sums its members' quantity and P&L. */
export function groupBySector(ideas: readonly Idea[]): Idea[] {
  const groups = new Map<string, Idea[]>();
  for (const each of ideas) {
    const members = groups.get(each.sector) ?? [];
    members.push(each);
    groups.set(each.sector, members);
  }
  return Array.from(groups, ([sector, members]) => ({
    id: `sector-${sector}`,
    symbol: sector,
    sector,
    quantity: members.reduce((sum, member) => sum + (member.quantity ?? 0), 0),
    pnl: Math.round(members.reduce((sum, member) => sum + (member.pnl ?? 0), 0) * 100) / 100,
    children: members,
  }));
}

let counter = 0;

/** A fresh feed sequence number. Take it outside state updaters, which StrictMode runs twice. */
export function nextTick(): number {
  return ++counter;
}

/** Live-feed tick `ticks`: a new idea at the front of the book and repriced neighbours. */
export function tick(ideas: readonly Idea[], ticks: number): Idea[] {
  const fresh = idea(100_000 + ticks, sectors[ticks % sectors.length]!);
  const next = [{ ...fresh, id: `live-${ticks}`, symbol: `NEW.${ticks}` }, ...ideas];
  // Reprice a few existing ideas so cells change as well as rows.
  for (let step = 1; step <= 3; step++) {
    const index = (ticks * 37 * step) % next.length;
    const current = next[index]!;
    const move = ((hash(ticks + step) % 2_001) - 1_000) / 100;
    next[index] = { ...current, move, pnl: Math.round((current.pnl ?? 0) * (1 + move / 100)) };
  }
  return next;
}

/** Untrusted rows: a missing field and a string where a number is expected. */
export function badIdeas(ticks: number): Idea[] {
  const missing = { id: `bad-missing-${ticks}`, symbol: `MISSING.${ticks}`, sector: "Energy" };
  const mixed = {
    ...idea(99_999, "Energy"),
    id: `bad-mixed-${ticks}`,
    symbol: `MIXED.${ticks}`,
    pnl: "n/a",
    price: "12.5",
  };
  // App data is untrusted: these shapes bypass the Idea type, as a JSON feed would.
  return [missing, mixed as unknown as Idea];
}
