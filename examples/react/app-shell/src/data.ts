// The approved design's sample data: a sidebar of pages and groups, and per-section list rows
// whose children are an idea's runs, a backtest's folds, a market's feeds or a job's steps.

export type Section = "research" | "portfolio" | "boards" | "ops";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  /** The section a page lists; groups have none. */
  readonly section?: Section;
  readonly count?: number;
  readonly children?: readonly NavItem[];
}

export type Status =
  | "testing"
  | "running"
  | "live"
  | "admitted"
  | "done"
  | "drafting"
  | "queued"
  | "rejected"
  | "failed"
  | "stale";

export type Tone = "accent" | "positive" | "muted" | "negative" | "warning";

export interface Entry {
  readonly id: string;
  readonly name: string;
  readonly status: Status;
  /** When it last changed. */
  readonly meta: string;
  /** A summary figure, such as `14 runs · 3 open`. */
  readonly figure: string;
  readonly children?: readonly Entry[];
}

type Raw = readonly [name: string, status: Status, meta: string, figure: string];

export const tree: readonly NavItem[] = [
  { id: "home", label: "Home", section: "research" },
  { id: "inbox", label: "Inbox", section: "ops", count: 3 },
  {
    id: "research",
    label: "Research",
    children: [
      { id: "ideas", label: "Ideas", section: "research" },
      {
        id: "next",
        label: "Next",
        children: [
          { id: "calendar", label: "Calendar", section: "research" },
          { id: "passmarks", label: "Pass marks", section: "research" },
        ],
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    children: [
      { id: "backtests", label: "Backtests", section: "portfolio" },
      { id: "studies", label: "Studies", section: "portfolio" },
      {
        id: "trading",
        label: "Trading",
        children: [
          { id: "paper", label: "Paper", section: "portfolio" },
          { id: "live", label: "Live", section: "portfolio" },
        ],
      },
    ],
  },
  {
    id: "boards",
    label: "Boards",
    children: [
      {
        id: "market",
        label: "Market",
        children: [
          { id: "perps", label: "Perps", section: "boards" },
          { id: "spot", label: "Spot", section: "boards" },
        ],
      },
      { id: "accounts", label: "Accounts", section: "boards" },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    children: [
      { id: "activity", label: "Activity", section: "ops" },
      { id: "backfills", label: "Backfills", section: "ops" },
    ],
  },
  { id: "settings", label: "Settings", section: "boards" },
];

const rows: Readonly<Record<Section, readonly Raw[]>> = {
  research: [
    ["Funding carry · BTC perp", "testing", "2h ago", "14 runs · 3 open"],
    ["Basis mean reversion · ETH", "admitted", "1d ago", "32 runs"],
    ["Open-interest breakout", "drafting", "3h ago", "no runs yet"],
    ["Weekend liquidity gap", "rejected", "4d ago", "9 runs · failed pass marks"],
    ["Cross-venue spread · SOL", "testing", "40m ago", "6 runs · 1 open"],
    ["Volatility term structure", "admitted", "2d ago", "21 runs"],
  ],
  portfolio: [
    ["carry-btc-perp · v14", "running", "12m ago", "fold 3 of 8"],
    ["basis-eth · v32", "done", "1d ago", "8 of 8 folds"],
    ["oi-breakout · v2", "failed", "3h ago", "fold 2 errored"],
    ["vol-term · v21", "done", "2d ago", "8 of 8 folds"],
    ["spread-sol · v6", "queued", "—", "waiting on data"],
  ],
  boards: [
    ["BTC-PERP · hyperliquid", "live", "2s ago", "book · trades · funding"],
    ["ETH-PERP · hyperliquid", "live", "2s ago", "book · trades · funding"],
    ["SOL-PERP · hyperliquid", "stale", "4m ago", "trades feed paused"],
    ["HYPE-PERP · hyperliquid", "live", "3s ago", "book · trades"],
  ],
  ops: [
    ["ingest · hyperliquid trades", "running", "since 09:14", "partition 2026-11-04"],
    ["backfill · funding 2024", "done", "1h ago", "366 of 366 days"],
    ["calendar sync", "failed", "5m ago", "retry in 5m"],
    ["nightly studies", "queued", "02:00", "4 studies"],
    ["notify · pass-mark changes", "done", "20m ago", "2 sent"],
  ],
};

/** What a row's children are called, by section. */
export const kinds: Readonly<Record<Section, string>> = {
  research: "runs",
  portfolio: "folds",
  boards: "feeds",
  ops: "steps",
};

/** The detail's second tab for a child row, by section. */
export const childTabs: Readonly<Record<Section, string>> = {
  research: "Folds",
  portfolio: "Stages",
  boards: "Health",
  ops: "Lines",
};

export const tones: Readonly<Record<Status, Tone>> = {
  testing: "accent",
  running: "accent",
  live: "positive",
  admitted: "positive",
  done: "positive",
  drafting: "muted",
  queued: "muted",
  rejected: "negative",
  failed: "negative",
  stale: "warning",
};

function inner(section: Section, [, status, meta]: Raw, index: number): Raw[] {
  if (section === "research") {
    if (status === "drafting") return [];
    const base = 14 + index * 3;
    return Array.from({ length: 2 + (index % 3) }, (_, k): Raw => {
      const open = k === 0 && status === "testing";
      const failed = k === 1 && status === "rejected";
      return [
        `run #${base - k}`,
        open ? "running" : failed ? "failed" : "done",
        k === 0 ? meta : `${k + 1}d ago`,
        open ? "fold 3 of 8" : failed ? "below pass marks" : "8 of 8 folds",
      ];
    });
  }
  if (section === "portfolio") {
    return [1, 2, 3, 4].map((k): Raw => {
      const fold: Status =
        status === "failed" && k === 2
          ? "failed"
          : status === "queued"
            ? "queued"
            : status === "running" && k >= 3
              ? k === 3
                ? "running"
                : "queued"
              : "done";
      return [
        `fold ${k}`,
        fold,
        status === "queued" ? "—" : meta,
        status === "failed" && k === 2 ? "worker exited 137" : `2024-Q${k} window`,
      ];
    });
  }
  if (section === "boards") {
    return (["book", "trades", "funding"] as const).map((feed): Raw => {
      const stale = status === "stale" && feed === "trades";
      return [
        feed,
        stale ? "stale" : "live",
        stale ? "4m ago" : "2s ago",
        feed === "book" ? "depth 20" : feed === "trades" ? "tick stream" : "8h interval",
      ];
    });
  }
  return (["fetch", "transform", "write"] as const).map((step, k): Raw => [
    step,
    status === "failed" && k === 0
      ? "failed"
      : status === "queued"
        ? "queued"
        : status === "running" && k === 2
          ? "running"
          : "done",
    status === "queued" ? "02:00" : meta,
    step === "fetch" ? "source api" : step === "transform" ? "normalize" : "parquet",
  ]);
}

function entry([name, status, meta, figure]: Raw, id: string, children?: Entry[]): Entry {
  return { id, name, status, meta, figure, ...(children === undefined ? {} : { children }) };
}

/** A section's rows, with their children; ids are `2` for a row and `2:1` for its child. */
export function entries(section: Section): readonly Entry[] {
  return rows[section].map((raw, index) =>
    entry(
      raw,
      `${index}`,
      inner(section, raw, index).map((child, k) => entry(child, `${index}:${k}`)),
    ),
  );
}

/** The detail pane's second tab: a row's children, or a child row's own lines. */
export function details(section: Section, item: Entry): readonly Entry[] {
  if (item.children !== undefined) return item.children;
  const { status, meta, figure, name } = item;
  const bad = status === "failed" || status === "stale";
  const tone: Status = bad
    ? status
    : status === "queued"
      ? "queued"
      : status === "running"
        ? "running"
        : "done";
  const lines: Raw[] =
    section === "research"
      ? [1, 2, 3].map((k) => [
          `fold ${k}`,
          k === 3 && status === "running" ? "running" : k === 2 && bad ? "failed" : "done",
          meta,
          k === 2 && bad ? "below pass marks" : `2024-Q${k}`,
        ])
      : section === "portfolio"
        ? (["train", "test", "score"] as const).map((stage, k) => [
            stage,
            k === 2 && status === "failed"
              ? "failed"
              : status === "queued"
                ? "queued"
                : status === "running" && k === 2
                  ? "running"
                  : "done",
            meta,
            stage === "train" ? "fit window" : stage === "test" ? "holdout window" : "pass marks",
          ])
        : section === "boards"
          ? [
              ["last message", tone, meta, figure],
              ["gaps today", bad ? "stale" : "done", meta, bad ? "1 gap · 4m" : "none"],
            ]
          : [
              ["09:14:00", tone, meta, `${name} started`],
              ["09:14:02", tone, meta, figure],
              ["09:15:40", tone, meta, bad ? "error: upstream 502" : "ok"],
            ];
  return lines.map((line, index) => entry(line, `${item.id}:${index}`));
}

/** The items from the root to the item with `id`, or an empty path. */
export function pathTo(id: string, items: readonly NavItem[] = tree): readonly NavItem[] {
  for (const item of items) {
    if (item.id === id) return [item];
    const found = item.children === undefined ? [] : pathTo(id, item.children);
    if (found.length > 0) return [item, ...found];
  }
  return [];
}
