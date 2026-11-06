import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createKernel, shiftedTreePreset } from "@densedash/core";
import type { ExpandedState, Kernel, KeymapEntry, Preset, ReporterPort } from "@densedash/core";
import { Densedash } from "@densedash/react";
import type { TreeHandle } from "@densedash/react";
import { AppShell } from "../ui/app-shell.js";
import { Kbd } from "../ui/kbd.js";
import { useKernel } from "../ui/keymap.js";
import { useList } from "../ui/list.js";
import { Tabs } from "../ui/tabs.js";
import { useTree } from "../ui/tree.js";

// Keys: swap these objects to rebind. The shell's parts never name a key.

/** The sidebar's page-wide layer: j and k move, l opens a group, h closes it or goes up. */
const sidebarKeys = {
  "tree.next": ["J"],
  "tree.prev": ["K"],
  "tree.expand": ["L"],
  "tree.collapse": ["H"],
} as const satisfies Preset;

/** The list's layer: the same moves with Shift. The detail tabs use the kernel's 1–9. */
const listKeys = shiftedTreePreset;

// Data: a sidebar of pages and groups, and per-section list rows whose children are an idea's
// runs, a backtest's folds, a market's feeds or a job's steps.

type Section = "research" | "portfolio" | "boards" | "ops";

interface NavItem {
  readonly id: string;
  readonly label: string;
  /** The section a page lists; groups have none. */
  readonly section?: Section;
  readonly count?: number;
  readonly children?: readonly NavItem[];
}

type Status =
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

interface Entry {
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

const nav: readonly NavItem[] = [
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

const sectionRows: Readonly<Record<Section, readonly Raw[]>> = {
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
const kinds: Readonly<Record<Section, string>> = {
  research: "runs",
  portfolio: "folds",
  boards: "feeds",
  ops: "steps",
};

/** The detail's second tab for a child row, by section. */
const childTabs: Readonly<Record<Section, string>> = {
  research: "Folds",
  portfolio: "Stages",
  boards: "Health",
  ops: "Lines",
};

const tones: Readonly<Record<Status, "accent" | "positive" | "muted" | "negative" | "warning">> = {
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
function entries(section: Section): readonly Entry[] {
  return sectionRows[section].map((raw, index) =>
    entry(
      raw,
      `${index}`,
      inner(section, raw, index).map((child, k) => entry(child, `${index}:${k}`)),
    ),
  );
}

/** The detail pane's second tab: a row's children, or a child row's own lines. */
function details(section: Section, item: Entry): readonly Entry[] {
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
function pathTo(id: string, items: readonly NavItem[] = nav): readonly NavItem[] {
  for (const item of items) {
    if (item.id === id) return [item];
    const found = item.children === undefined ? [] : pathTo(id, item.children);
    if (found.length > 0) return [item, ...found];
  }
  return [];
}

// Status: the kernel's reporter wraps every command it runs, so the app can compare state
// before and after a key and report what it did, including keys that change nothing.

type Observer = (command: string, run: () => void) => void;
let observer: Observer | undefined;

function observeCommands(next: Observer): () => void {
  observer = next;
  return () => {
    if (observer === next) observer = undefined;
  };
}

const reporter: ReporterPort = {
  error: (cause, context) => console.error(cause, context),
  warn: (message) => console.warn(message),
  trace<A>(command: string, run: () => A): A {
    const current = observer;
    if (current === undefined) return run();
    let result: { readonly value: A } | undefined;
    current(command, () => {
      result = { value: run() };
    });
    if (result === undefined) throw new Error(`Command ${command} did not run.`);
    return result.value;
  },
};

/** Owns one browser kernel with the tracing reporter; the default kernel binds the preset. */
function Provider({ children }: { children: ReactNode }) {
  const [kernel, setKernel] = useState<Kernel | null>(null);
  useEffect(() => {
    const created = createKernel({ ports: { reporter } });
    setKernel(created);
    return () => created.dispose();
  }, []);
  return kernel === null ? null : (
    <Densedash.Provider kernel={kernel}>{children}</Densedash.Provider>
  );
}

type TabValue = "overview" | "items" | "log";

interface Moment {
  readonly highlighted: string | null;
  readonly expanded: ExpandedState;
}

function pageOf(id: string): NavItem {
  const item = pathTo(id).at(-1);
  if (item === undefined) throw new Error(`No page "${id}".`);
  return item;
}

const firstPage = pageOf("ideas");
const firstItem = "0";
const counts = new Map(
  (["research", "portfolio", "boards", "ops"] as const).map((key) => [key, entries(key).length]),
);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function findEntry(rows: readonly Entry[], id: string | null): Entry | undefined {
  for (const row of rows) {
    if (row.id === id) return row;
    const child = row.children?.find((candidate) => candidate.id === id);
    if (child !== undefined) return child;
  }
  return undefined;
}

function parentOf(rows: readonly Entry[], item: Entry): Entry | undefined {
  return rows.find((row) => row.children?.includes(item) === true);
}

function isOpen(expanded: ExpandedState, id: string | null): boolean {
  return id !== null && (expanded === true || expanded[id] === true);
}

/** The legend shows each pane's moves and its open/close keys as separate items. */
function legendGroup(item: KeymapEntry): string | undefined {
  const turns = item.command === "tree.expand" || item.command === "tree.collapse";
  if (item.layer === "sidebar") return turns ? "open · close group" : "sidebar";
  if (item.layer === "list") return turns ? "expand · collapse row" : "list";
  return item.layer ?? item.group;
}

/** The design's legend order: the sidebar's keys, then the list's, then the detail tabs. */
const legendOrder = [
  "sidebar",
  "open · close group",
  "list",
  "expand · collapse row",
  "detail tabs",
] as const;

function describeSidebar(command: string, before: Moment, after: Moment): string {
  const from = pathTo(before.highlighted ?? "").at(-1);
  const to = pathTo(after.highlighted ?? "").at(-1);
  if (from === undefined || to === undefined) return command;
  const group = from.children !== undefined;
  switch (command) {
    case "tree.next":
    case "tree.prev":
      if (from === to)
        return `sidebar: nothing ${command === "tree.next" ? "below" : "above"} ${from.label}`;
      return `sidebar: ${to.label}${to.children === undefined ? "" : " (group)"}`;
    case "tree.expand":
      if (!group) return `${from.label} has nothing to open`;
      return isOpen(before.expanded, from.id)
        ? `${from.label} is already open`
        : `opened ${from.label}`;
    case "tree.collapse":
      if (isOpen(before.expanded, from.id) && !isOpen(after.expanded, from.id))
        return `closed ${from.label}`;
      return from === to ? `${from.label} is top level` : `up to ${to.label}`;
    default:
      return command;
  }
}

function describeList(
  command: string,
  rows: readonly Entry[],
  kind: string,
  before: Moment,
  after: Moment,
): string {
  const from = findEntry(rows, before.highlighted);
  const to = findEntry(rows, after.highlighted);
  if (from === undefined || to === undefined) return command;
  const parent = parentOf(rows, from);
  switch (command) {
    case "tree.next":
    case "tree.prev": {
      if (from === to)
        return `list: nothing ${command === "tree.next" ? "below" : "above"} ${from.name}`;
      const inside = parentOf(rows, to);
      return `list: ${to.name}${inside === undefined ? "" : ` (inside ${inside.name})`}`;
    }
    case "tree.expand": {
      if (parent !== undefined) return `${from.name} has no rows under it`;
      const count = from.children?.length ?? 0;
      if (count === 0) return `no ${kind} in ${from.name}`;
      return isOpen(before.expanded, from.id)
        ? `${from.name} is already expanded`
        : `expanded ${from.name} (${count} ${kind})`;
    }
    case "tree.collapse":
      if (parent !== undefined) return `up to ${to.name}`;
      return isOpen(before.expanded, from.id) && !isOpen(after.expanded, from.id)
        ? `collapsed ${from.name}`
        : `${from.name} is already collapsed`;
    default:
      return command;
  }
}

function moment(handle: TreeHandle<NavItem> | TreeHandle<Entry>): Moment {
  const { highlighted, expanded } = handle.state.get();
  return { highlighted, expanded };
}

function slug(text: string): string {
  return (text.split(" ·")[0] ?? text).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function Shell() {
  const { keyboard } = useKernel().ports;
  const [page, setPage] = useState(firstPage);
  const [itemId, setItemId] = useState(firstItem);
  const [tab, setTab] = useState<TabValue>("overview");
  const [report, setReport] = useState<{ key: string; text: string } | null>(null);

  const section = page.section ?? "research";
  const kind = kinds[section];
  const rows = useMemo(() => entries(section), [section]);

  // The shell stores no navigation state: the sidebar's cursor and open groups live in this
  // tree, the list's in the list, and the open page, item and tab in this component.
  const sidebar = useTree({
    data: nav,
    getRowId: (item) => item.id,
    getSubRows: (item) => item.children,
    getTextValue: (item) => item.label,
    keys: { label: "sidebar", preset: sidebarKeys },
    highlighted: { defaultValue: firstPage.id },
    expanded: { defaultValue: { research: true, next: true, portfolio: true } },
  });
  // The list's cursor is controlled: a move only requests it until the next render.
  const requested = useRef<string | null>(null);
  const list = useList({
    data: rows,
    getRowId: (row) => row.id,
    getSubRows: (row) => row.children,
    getTextValue: (row) => row.name,
    keys: { label: "list", preset: listKeys },
    highlighted: {
      value: itemId,
      onChange: (id) => {
        requested.current = id;
        if (id !== null) setItemId(id);
      },
    },
    expanded: { defaultValue: { [firstItem]: true } },
  });

  const item = findEntry(rows, itemId) ?? rows[0];
  const parent = item === undefined ? undefined : parentOf(rows, item);
  const path = pathTo(page.id);
  const trail = path.map((step) => step.label).join(" / ");
  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "items", label: parent === undefined ? capitalize(kind) : childTabs[section] },
    { value: "log", label: "Log" },
  ] as const;

  // Describe each command against the state it started from, so keys that change nothing are
  // reported too.
  const latest = useRef({ rows, kind, tabs });
  useLayoutEffect(() => {
    latest.current = { rows, kind, tabs };
  });
  useLayoutEffect(() => {
    let event: KeyboardEvent | null = null;
    const record = (next: KeyboardEvent) => {
      event = next;
    };
    window.addEventListener("keydown", record, true);
    const stop = observeCommands((command, run) => {
      const shifted = event?.shiftKey === true;
      const handle = shifted ? list : sidebar;
      const before = moment(handle);
      requested.current = null;
      run();
      const settled = moment(handle);
      const after = shifted
        ? { ...settled, highlighted: requested.current ?? settled.highlighted }
        : settled;
      const current = latest.current;
      const number = /^tabs\.select\.(\d)$/.exec(command)?.[1];
      const text =
        number !== undefined
          ? `detail tab: ${current.tabs[Number(number) - 1]?.label ?? number}`
          : shifted
            ? describeList(command, current.rows, current.kind, before, after)
            : describeSidebar(command, before, after);
      const key = event === null ? "" : event.key.toUpperCase();
      const parsed = keyboard.parse(shifted ? `Shift+${key}` : key);
      setReport({ key: parsed.ok ? keyboard.format(parsed.hotkey) : key, text });
    });
    return () => {
      window.removeEventListener("keydown", record, true);
      stop();
    };
  }, [keyboard, sidebar, list]);

  function openPage(next: NavItem) {
    setPage(next);
    setItemId(firstItem);
    setTab("overview");
  }

  const isRow = parent === undefined;
  const lines = item === undefined ? [] : details(section, item);
  const facts =
    item === undefined
      ? []
      : [
          { term: "Section", value: trail, mono: false },
          isRow
            ? { term: "Detail", value: item.figure, mono: true }
            : { term: "Parent", value: parent.name, mono: false },
          isRow
            ? { term: capitalize(kind), value: `${lines.length} total`, mono: true }
            : { term: "Detail", value: item.figure, mono: true },
          { term: "Last update", value: item.meta, mono: true },
          { term: "Owner", value: "research-worker", mono: false },
        ];
  const name = item === undefined ? "" : slug(isRow ? item.name : `${parent.name} ${item.name}`);
  const log =
    item === undefined
      ? ""
      : [
          `09:41:02  ${name}  status ${item.status}`,
          `09:40:57  ${name}  ${item.figure}`,
          `09:38:12  ${name}  checkpoint written`,
          `09:14:00  ${name}  started by research-worker`,
        ].join("\n");

  return (
    <AppShell.Root aria-label="App shell">
      <AppShell.Panes>
        <AppShell.Sidebar
          tree={sidebar}
          heading="densedash"
          label="Navigation"
          page={page.id}
          onPageChange={openPage}
        >
          {(row) => {
            const { label, children, count, section: listed } = row.original;
            const shown =
              children === undefined
                ? (count ?? (listed === undefined ? undefined : counts.get(listed)))
                : undefined;
            return (
              <>
                <AppShell.Label>{label}</AppShell.Label>
                {shown === undefined ? null : <AppShell.Count>{shown}</AppShell.Count>}
              </>
            );
          }}
        </AppShell.Sidebar>
        <AppShell.List
          key={page.id}
          list={list}
          heading={page.label}
          breadcrumb={path
            .slice(0, -1)
            .map((step) => step.label)
            .join(" / ")}
          label={page.label}
          aria-label="List"
        >
          {(row) => (
            <>
              <AppShell.Label>{row.original.name}</AppShell.Label>
              {row.depth === 0 ? (
                <span data-slot="example-badge">
                  {row.original.children?.length ?? 0} {kind}
                </span>
              ) : null}
              <span data-slot="example-status" data-tone={tones[row.original.status]}>
                {row.original.status}
              </span>
            </>
          )}
        </AppShell.List>
        <AppShell.Detail
          aria-label="Detail"
          items={tabs}
          value={tab}
          onValueChange={setTab}
          label="Detail views"
          keys={{ label: "detail tabs" }}
          header={
            item === undefined ? null : (
              <>
                <div data-slot="example-path">{isRow ? trail : `${trail} / ${parent.name}`}</div>
                <div data-slot="example-heading">
                  <h2>{item.name}</h2>
                  <span data-slot="example-state" data-tone={tones[item.status]}>
                    {item.status}
                  </span>
                  <span data-slot="example-updated">updated {item.meta}</span>
                </div>
              </>
            )
          }
        >
          <Tabs.Panel value="overview">
            <dl data-slot="example-facts">
              {facts.map((fact) => (
                <Fragment key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd data-mono={fact.mono ? "" : undefined}>{fact.value}</dd>
                </Fragment>
              ))}
            </dl>
          </Tabs.Panel>
          <Tabs.Panel value="items">
            <div data-slot="example-lines">
              {lines.map((line) => (
                <div data-slot="example-line" key={line.id}>
                  <span data-slot="example-name">{line.name}</span>
                  <span data-slot="example-state" data-tone={tones[line.status]}>
                    {line.status}
                  </span>
                  <span data-slot="example-meta">{line.meta}</span>
                  <span data-slot="example-figure">{line.figure}</span>
                </div>
              ))}
              {lines.length === 0 ? <div data-slot="example-empty">Nothing here yet.</div> : null}
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="log">
            <pre data-slot="example-log">{log}</pre>
          </Tabs.Panel>
        </AppShell.Detail>
      </AppShell.Panes>
      <AppShell.Footer groupBy={legendGroup} order={legendOrder}>
        {report === null ? (
          "Try j, k, ⇧J, ⇧K, l, ⇧L anywhere"
        ) : (
          <>
            <Kbd>{report.key}</Kbd>
            {report.text}
          </>
        )}
      </AppShell.Footer>
    </AppShell.Root>
  );
}

export default function AppShellExample() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
