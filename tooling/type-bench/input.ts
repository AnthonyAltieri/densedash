// Measure the emitted API that consumers typecheck. Run pnpm build first.
// See README.md for the React part consumers measured outside this bench.
import {
  createKernel,
  tradingPreset,
  version as coreVersion,
  type StorePort,
  type KeyboardHotkey,
} from "../../packages/core/dist/index.js";
import { version as cssVersion } from "../../packages/css/dist/index.js";
import {
  Tabs,
  Tree,
  columns,
  useTable,
  useTree,
  version as reactVersion,
} from "../../packages/react/dist/index.js";

declare module "../../packages/core/dist/index.js" {
  interface Register {
    commands: { next: unknown; open: unknown; approve: unknown };
  }
}

export type PackageSurface = {
  core: typeof coreVersion;
  css: typeof cssVersion;
  react: typeof reactVersion;
};

type Columns<Row> = {
  [Key in keyof Row]: { key: Key; value: Row[Key] };
}[keyof Row];

export type SampleColumn = Columns<{ id: string; count: number; enabled: boolean }>;

// A plugin augments an existing store, while an explicit clock overrides defaults.
// Reading the added field forces the compiler to exercise public plugin inference.
export function createWorkbenchKernel(store: StorePort) {
  const kernel = createKernel({
    keys: { preset: tradingPreset, overrides: { open: ["Space"], next: ["ArrowDown"] } },
    plugins: [
      {
        name: "instrumented-store",
        provides: {
          store: (base) => ({
            ...store,
            kind: "instrumented" as const,
            createdAt: base.clock.now(),
            warn: (message: string) => base.reporter.warn(message),
          }),
        },
        setup: (app) => () => app.ports.reporter.warn("Workbench disposed"),
      },
    ],
    ports: {
      clock: {
        now: () => Date.now(),
        setTimeout(run, ms) {
          const timer = globalThis.setTimeout(run, ms);
          return () => globalThis.clearTimeout(timer);
        },
        source: "workbench" as const,
      },
    },
  });
  const storeKind: "instrumented" = kernel.ports.store.kind;
  const clockSource: "workbench" = kernel.ports.clock.source;
  const shortcut: KeyboardHotkey = "Mod+K";
  kernel.ports.keyboard.bind(shortcut, () => {});
  kernel.ports.keyboard.bind(["G", "H"], () => {}, { scope: "workbench", enabled: true });
  const unregister = kernel.commands.register("workbench", [
    { id: "next", label: "Next row", group: "rows", run: () => {} },
    {
      id: "open",
      label: "Open row",
      run: ({ event }) => {
        event?.preventDefault();
      },
    },
    {
      id: "approve",
      label: "Approve row",
      confirm: { prompt: "Approve selected row?" },
      run: () => {},
    },
  ]);
  kernel.commands.invoke("open");
  const keymap = kernel.commands.keymap.get();
  return { kernel, storeKind, clockSource, keymap, unregister };
}

// A 30-column table: each accessor types its column's `format` and `sort`.
interface WideRow {
  id: string;
  f00: string;
  f01: number;
  f02: number;
  f03: boolean;
  f04?: string;
  f05: number;
  f06: string;
  f07: number;
  f08: number;
  f09?: boolean;
  f10: string;
  f11: number;
  f12: string;
  f13: number;
  f14?: number;
  f15: boolean;
  f16: string;
  f17: number;
  f18: string;
  f19?: number;
  f20: number;
  f21: boolean;
  f22: string;
  f23: number;
  f24?: string;
  f25: number;
  f26: number;
  f27: boolean;
  f28: string;
  f29?: number;
  children?: readonly WideRow[];
}

const column = columns<WideRow>();
const wideColumns = [
  column.accessor("f00", { header: "f00", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f01", { header: "f01", format: (value) => value.toFixed(2) }),
  column.accessor("f02", { header: "f02", format: (value) => value.toFixed(2) }),
  column.accessor("f03", { header: "f03" }),
  column.accessor("f04", { header: "f04", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f05", { header: "f05", format: (value) => value.toFixed(2) }),
  column.accessor("f06", { header: "f06", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f07", { header: "f07", format: (value) => value.toFixed(2) }),
  column.accessor("f08", { header: "f08", format: (value) => value.toFixed(2) }),
  column.accessor("f09", { header: "f09" }),
  column.accessor("f10", { header: "f10", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f11", { header: "f11", format: (value) => value.toFixed(2) }),
  column.accessor("f12", { header: "f12", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f13", { header: "f13", format: (value) => value.toFixed(2) }),
  column.accessor("f14", { header: "f14", format: (value) => value.toFixed(2) }),
  column.accessor("f15", { header: "f15" }),
  column.accessor("f16", { header: "f16", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f17", { header: "f17", format: (value) => value.toFixed(2) }),
  column.accessor("f18", { header: "f18", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f19", { header: "f19", format: (value) => value.toFixed(2) }),
  column.accessor("f20", { header: "f20", format: (value) => value.toFixed(2) }),
  column.accessor("f21", { header: "f21" }),
  column.accessor("f22", { header: "f22", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f23", { header: "f23", format: (value) => value.toFixed(2) }),
  column.accessor("f24", { header: "f24", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f25", { header: "f25", format: (value) => value.toFixed(2) }),
  column.accessor("f26", { header: "f26", format: (value) => value.toFixed(2) }),
  column.accessor("f27", { header: "f27" }),
  column.accessor("f28", { header: "f28", sort: (a, b) => a.localeCompare(b) }),
  column.accessor("f29", { header: "f29", format: (value) => value.toFixed(2) }),
];

export function useWideTable(roots: readonly WideRow[]) {
  return useTable({
    roots,
    columns: wideColumns,
    getKey: (row) => row.id,
    getChildren: (row) => row.children,
    sort: { defaultValue: { column: "f02", direction: "ascending" } },
  });
}

// The same rows as a tree: callbacks infer the item type, and a row class reads the row state.
export function WideTree({ roots }: { readonly roots: readonly WideRow[] }) {
  const tree = useTree({
    data: roots,
    getRowId: (row) => row.id,
    getSubRows: (row) => row.children,
    getTextValue: (row) => row.f00,
  });
  return Tree.Root({
    tree,
    children: Tree.Viewport({
      tree,
      children: (row) =>
        Tree.Row({
          row,
          className: (state) => (state.highlighted ? "highlighted" : undefined),
          children: row.original.f00,
        }),
    }),
  });
}

const tabs = [
  { value: "orders", label: "Orders" },
  { value: "fills", label: "Fills" },
] as const;

// Values are inferred from the items, and a change callback can cancel.
export const wideTabs = Tabs.Root({
  items: tabs,
  defaultValue: "orders",
  onValueChange: (value, details) => {
    if (value === "fills") details.cancel();
  },
  children: Tabs.Panel({ value: "fills", children: "Fills" }),
});
