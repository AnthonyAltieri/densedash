// Measure the emitted API that consumers typecheck. Run pnpm build first.
import {
  createKernel,
  tradingPreset,
  version as coreVersion,
  type StorePort,
  type KeyboardHotkey,
} from "../../packages/core/dist/index.js";
import { version as cssVersion } from "../../packages/css/dist/index.js";
import { version as reactVersion } from "../../packages/react/dist/index.js";

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
