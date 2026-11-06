import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ExpandedState, KeymapEntry } from "@densedash/core";
import { AppShell, Kbd, Tabs, useKernel, useList, useTree } from "@densedash/react";
import type { TreeHandle } from "@densedash/react";
import { childTabs, details, entries, kinds, pathTo, tones, tree } from "./data.ts";
import type { Entry, NavItem, Section } from "./data.ts";
import { listKeys, sidebarKeys } from "./preset.ts";
import { observeCommands } from "./trace.ts";

type TabValue = "overview" | "items" | "log";

interface Report {
  readonly key: string;
  readonly text: string;
}

function pageOf(id: string): NavItem {
  const item = pathTo(id).at(-1);
  if (item === undefined) throw new Error(`No page "${id}".`);
  return item;
}

const firstPage = pageOf("ideas");
const firstItem = "0";

function sectionOf(page: NavItem): Section {
  return page.section ?? "research";
}

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

function parentOf(rows: readonly Entry[], entry: Entry): Entry | undefined {
  return rows.find((row) => row.children?.includes(entry) === true);
}

function isOpen(expanded: ExpandedState, id: string | null): boolean {
  return id !== null && (expanded === true || expanded[id] === true);
}

/** The design's legend: moves and open/close keys of each pane as separate items. */
function legendGroup(entry: KeymapEntry): string | undefined {
  const turns = entry.command === "tree.expand" || entry.command === "tree.collapse";
  if (entry.layer === "sidebar") return turns ? "open · close group" : "sidebar";
  if (entry.layer === "list") return turns ? "expand · collapse row" : "list";
  return entry.layer ?? entry.group;
}

/** The design's legend order: the sidebar's keys, then the list's, then the detail tabs. */
const legendOrder = [
  "sidebar",
  "open · close group",
  "list",
  "expand · collapse row",
  "detail tabs",
] as const;

interface Moment {
  readonly highlighted: string | null;
  readonly expanded: ExpandedState;
}

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

export function App() {
  const { keyboard } = useKernel().ports;
  const [page, setPage] = useState(firstPage);
  const [itemId, setItemId] = useState(firstItem);
  const [tab, setTab] = useState<TabValue>("overview");
  const [report, setReport] = useState<Report | null>(null);

  const section = sectionOf(page);
  const kind = kinds[section];
  const rows = useMemo(() => entries(section), [section]);
  const counts = useMemo(
    () =>
      new Map(
        (["research", "portfolio", "boards", "ops"] as const).map((key) => [
          key,
          entries(key).length,
        ]),
      ),
    [],
  );

  // The shell stores no navigation state: the sidebar's cursor and open groups live in this
  // tree, the list's in the list, and the open page, item and tab in this component.
  const sidebar = useTree({
    data: tree,
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
    getRowId: (entry) => entry.id,
    getSubRows: (entry) => entry.children,
    getTextValue: (entry) => entry.name,
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
  // reported too. The kernel's reporter wraps every command it runs (see trace.ts).
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
    <AppShell.Root className="shell" aria-label="App shell">
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
                <span className="badge">
                  {row.original.children?.length ?? 0} {kind}
                </span>
              ) : null}
              <span className="status" data-tone={tones[row.original.status]}>
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
                <div className="path">{isRow ? trail : `${trail} / ${parent.name}`}</div>
                <div className="heading">
                  <h2>{item.name}</h2>
                  <span className="state" data-tone={tones[item.status]}>
                    {item.status}
                  </span>
                  <span className="updated">updated {item.meta}</span>
                </div>
              </>
            )
          }
        >
          <Tabs.Panel value="overview">
            <dl className="facts">
              {facts.map((fact) => (
                <Fragment key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd className={fact.mono ? "mono" : undefined}>{fact.value}</dd>
                </Fragment>
              ))}
            </dl>
          </Tabs.Panel>
          <Tabs.Panel value="items">
            <div className="lines">
              {lines.map((line) => (
                <div className="line" key={line.id}>
                  <span className="name">{line.name}</span>
                  <span className="state" data-tone={tones[line.status]}>
                    {line.status}
                  </span>
                  <span className="meta">{line.meta}</span>
                  <span className="figure">{line.figure}</span>
                </div>
              ))}
              {lines.length === 0 ? <div className="empty">Nothing here yet.</div> : null}
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="log">
            <pre className="log">{log}</pre>
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
