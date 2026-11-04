import type { StorePort } from "../ports/store.js";
export { keyboardContract } from "./keyboard.js";
export type { KeyboardContractOptions, MakeKeyboardPort } from "./keyboard.js";

/** A fresh implementation per case keeps contract runs independent. */
export type MakeStorePort = () => StorePort;

export interface ContractCase<Make> {
  readonly name: string;
  run(make: Make): void | Promise<void>;
}

/** Adapts cases to vitest, node:test, or another runner without importing one. */
export function runContract<Make>({
  test,
  cases,
  make,
}: {
  test: (name: string, run: () => void | Promise<void>) => unknown;
  cases: readonly ContractCase<Make>[];
  make: Make;
}): void {
  for (const contract of cases) {
    test(contract.name, () => contract.run(make));
  }
}

function assertSequence(actual: readonly unknown[], expected: readonly unknown[]): void {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(`Expected [${expected.join(", ")}], received [${actual.join(", ")}].`);
  }
}

export const storeContract: readonly ContractCase<MakeStorePort>[] = [
  {
    name: "synchronous read after set",
    run(make) {
      const store = make().create(0);
      store.set(1);
      if (store.get() !== 1) throw new Error("set must update state synchronously.");
      store.set((previous) => previous + 1);
      if (store.get() !== 2) throw new Error("Updater must receive the current state.");
    },
  },
  {
    name: "notification order",
    run(make) {
      const store = make().create(0);
      const received: string[] = [];
      const unsubscribeFirst = store.subscribe((value) => received.push(`first:${value}`));
      const unsubscribeSecond = store.subscribe((value) => received.push(`second:${value}`));
      try {
        store.set(1);
        store.set(2);
        assertSequence(received, ["first:1", "second:1", "first:2", "second:2"]);
      } finally {
        unsubscribeSecond();
        unsubscribeFirst();
      }
    },
  },
  {
    name: "batch notifies once",
    run(make) {
      const port = make();
      const store = port.create(0);
      const received: number[] = [];
      const unsubscribe = store.subscribe((value) => received.push(value));
      try {
        port.batch(() => {
          store.set(1);
          store.set(2);
        });
        assertSequence(received, [2]);
      } finally {
        unsubscribe();
      }
    },
  },
  {
    name: "unsubscribe stops notifications",
    run(make) {
      const store = make().create(0);
      const received: number[] = [];
      const unsubscribe = store.subscribe((value) => received.push(value));
      try {
        store.set(1);
      } finally {
        unsubscribe();
      }
      store.set(2);
      assertSequence(received, [1]);
    },
  },
];
