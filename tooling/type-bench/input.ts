import {
  createKernel,
  version as coreVersion,
  type StorePort,
} from "../../packages/core/src/index.js";
import { version as cssVersion } from "../../packages/css/src/index.js";
import { version as reactVersion } from "../../packages/react/src/index.js";

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
  return { kernel, storeKind, clockSource };
}
