// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Command } from "../index.js";
import { harness, press, useVirtualClock } from "../../test/harness.js";

beforeEach(useVirtualClock);
afterEach(() => vi.useRealTimers());

test("scope resolution gives descendants priority, then the latest peer, then global", () => {
  const { kernel } = harness({ preset: { action: ["A"] } });
  const calls: string[] = [];
  const action = (scope: string): Command[] => [
    {
      id: "action",
      label: scope,
      run: () => {
        calls.push(scope);
      },
    },
  ];
  kernel.commands.register("global", action("global"));
  const child = kernel.commands.register("child", action("child"), { parent: "parent" });
  const parent = kernel.commands.register("parent", action("parent"));
  kernel.commands.invoke("action");
  press("a");
  const peer = kernel.commands.register("peer", action("peer"));
  kernel.commands.invoke("action");
  press("a");
  peer();
  child();
  kernel.commands.invoke("action");
  parent();
  kernel.commands.invoke("action");
  expect(calls).toEqual(["child", "child", "peer", "peer", "parent", "global"]);
});

test("an exclusive layer blocks unrelated commands until its owner unregisters", () => {
  const { kernel } = harness({ preset: { background: ["B"], dialog: ["D"] } });
  const calls: string[] = [];
  kernel.commands.register("page", [
    {
      id: "background",
      label: "Page",
      run: () => {
        calls.push("page");
      },
    },
  ]);
  const release = kernel.commands.register(
    "dialog",
    [
      {
        id: "dialog",
        label: "Dialog",
        run: () => {
          calls.push("dialog");
        },
      },
    ],
    { only: true },
  );
  press("b");
  kernel.commands.invoke("background");
  press("d");
  expect(kernel.commands.keymap.get().map((entry) => entry.command)).toEqual(["dialog"]);
  release();
  press("b");
  expect(calls).toEqual(["dialog", "page"]);
});

test("page key layers reserve keys ahead of newer ordinary scopes and release on unregister", () => {
  const { kernel } = harness({ preset: { layer: ["A"], ordinary: ["A"] } });
  const calls: string[] = [];
  const release = kernel.commands.register(
    "layer",
    [
      {
        id: "layer",
        label: "Layer",
        run: () => {
          calls.push("layer");
        },
      },
    ],
    { keys: { label: "Pane" } },
  );
  kernel.commands.register("ordinary", [
    {
      id: "ordinary",
      label: "Ordinary",
      run: () => {
        calls.push("ordinary");
      },
    },
  ]);
  press("a");
  expect(kernel.commands.keymap.get()).toEqual([
    expect.objectContaining({ command: "layer", layer: "Pane" }),
  ]);
  release();
  press("a");
  expect(calls).toEqual(["layer", "ordinary"]);
});

test("invalid saved overrides fall back atomically while empty overrides unbind", () => {
  const { kernel, warnings } = harness({ preset: { open: ["O"] } });
  let calls = 0;
  kernel.commands.register("page", [
    {
      id: "open",
      label: "Open",
      run: () => {
        calls++;
      },
    },
  ]);
  kernel.commands.setOverrides({ open: ["P", "Bogus"] });
  press("p");
  press("o");
  expect(calls).toBe(1);
  expect(warnings).toHaveLength(1);
  kernel.commands.setOverrides({ open: [] });
  expect(press("o").defaultPrevented).toBe(false);
  expect(calls).toBe(1);
});

function sequence() {
  const { kernel } = harness({ preset: { jump: [["G", "H", "J"]] } });
  const calls: KeyboardEvent[] = [];
  kernel.commands.register(
    "page",
    [
      {
        id: "jump",
        label: "Jump",
        run: ({ event }) => {
          if (event) calls.push(event);
        },
      },
    ],
    { timeout: 50 },
  );
  return { kernel, calls };
}

test("a sequence prefix publishes progress without running the command early", () => {
  const { kernel, calls } = sequence();
  press("g");
  expect(kernel.ports.keyboard.pending.get()).toEqual([
    expect.objectContaining({ hotkey: ["G", "H", "J"], matchedStepCount: 1, scope: "page" }),
  ]);
  press("h");
  expect(kernel.ports.keyboard.pending.get()[0]?.matchedStepCount).toBe(2);
  expect(calls).toEqual([]);
});

test("sequence completion runs exactly once with the completing event and clears progress", () => {
  const { kernel, calls } = sequence();
  press("g");
  press("h");
  const completed = press("j");
  expect(calls).toEqual([completed]);
  expect(kernel.ports.keyboard.pending.get()).toEqual([]);
});

test("a wrong sequence key discards the prefix so a trailing suffix cannot fire", () => {
  const { kernel, calls } = sequence();
  press("g");
  press("x");
  press("h");
  press("j");
  expect(calls).toEqual([]);
  expect(kernel.ports.keyboard.pending.get()).toEqual([]);
  press("g");
  press("h");
  press("j");
  expect(calls).toHaveLength(1);
});

test("sequence timeout expires under the injected virtual clock without another key", () => {
  const { kernel, calls } = sequence();
  press("g");
  vi.advanceTimersByTime(51);
  expect(kernel.ports.clock.now()).toBe(51);
  expect(kernel.ports.keyboard.pending.get()).toEqual([]);
  press("h");
  press("j");
  expect(calls).toEqual([]);
});

test("confirmation consumes intent before running and preserves the initiating event", () => {
  const { kernel } = harness({ preset: { action: ["A"] } });
  const calls: (KeyboardEvent | undefined)[] = [];
  kernel.commands.register("page", [
    {
      id: "action",
      label: "Delete",
      confirm: { prompt: "Delete row?" },
      run: ({ event }) => {
        expect(kernel.commands.confirm.get()).toBeNull();
        calls.push(event);
        kernel.commands.accept();
      },
    },
  ]);
  const event = press("a");
  expect(calls).toEqual([]);
  expect(kernel.commands.confirm.get()).toEqual({
    command: "action",
    label: "Delete",
    prompt: "Delete row?",
    scope: "page",
  });
  expect(kernel.commands.keymap.get().map((entry) => entry.command)).toEqual(["confirm", "cancel"]);
  press("y");
  press("y");
  expect(calls).toEqual([event]);
});

test("confirmation rechecks enabled state instead of running stale authorized intent", () => {
  const { kernel } = harness({ preset: { action: ["A"] } });
  let enabled = true;
  let calls = 0;
  kernel.commands.register("page", [
    {
      id: "action",
      label: "Action",
      enabled: () => enabled,
      confirm: { prompt: "Run?" },
      run: () => {
        calls++;
      },
    },
  ]);
  kernel.commands.invoke("action");
  enabled = false;
  kernel.commands.accept();
  expect(calls).toBe(0);
  expect(kernel.commands.confirm.get()).toBeNull();
});

test("canceling or unregistering confirmation never leaves runnable intent", () => {
  const { kernel } = harness({ preset: { action: ["A"] } });
  let calls = 0;
  const release = kernel.commands.register("page", [
    {
      id: "action",
      label: "Action",
      confirm: { prompt: "Run?" },
      run: () => {
        calls++;
      },
    },
  ]);
  kernel.commands.invoke("action");
  press("Escape");
  kernel.commands.accept();
  expect(kernel.commands.confirm.get()).toBeNull();
  kernel.commands.invoke("action");
  release();
  kernel.commands.accept();
  expect(kernel.commands.confirm.get()).toBeNull();
  expect(calls).toBe(0);
});

test("repeated keydown cannot open or accept a destructive confirmation", () => {
  const { kernel } = harness({ preset: { action: ["A"] } });
  let calls = 0;
  kernel.commands.register("page", [
    {
      id: "action",
      label: "Action",
      confirm: { prompt: "Run?" },
      run: () => {
        calls++;
      },
    },
  ]);
  press("a", { repeat: true });
  expect(kernel.commands.confirm.get()).toBeNull();
  press("a");
  press("y", { repeat: true });
  expect(kernel.commands.confirm.get()).not.toBeNull();
  expect(calls).toBe(0);
});

test("definition updates refresh pending confirmation and execute the latest handler", () => {
  const { kernel } = harness({ preset: { action: ["A"] } });
  const calls: string[] = [];
  kernel.commands.register("page", [
    {
      id: "action",
      label: "Old",
      confirm: { prompt: "Old?" },
      run: () => {
        calls.push("old");
      },
    },
  ]);
  press("a");
  kernel.commands.update("page", [
    {
      id: "action",
      label: "New",
      confirm: { prompt: "New?" },
      run: () => {
        calls.push("new");
      },
    },
  ]);
  expect(kernel.commands.confirm.get()).toEqual(
    expect.objectContaining({ label: "New", prompt: "New?" }),
  );
  press("y");
  expect(calls).toEqual(["new"]);
});

test("DD-66: absent onOpen releases Enter to the outer command or browser as handlers change", () => {
  const { kernel, navigation } = harness();
  const calls: string[] = [];
  const release = kernel.commands.register("page", [
    {
      id: "open",
      label: "Page",
      run: () => {
        calls.push("page");
      },
    },
  ]);
  const rows = navigation();
  rows.commands.first();
  press("Enter");
  rows.update({
    onOpen: (item) => {
      calls.push(item.id);
    },
  });
  press("Enter");
  rows.update({
    onOpen: () => {
      calls.push("replacement");
    },
  });
  press("Enter");
  rows.update({ onOpen: undefined });
  press("Enter");
  release();
  expect(press("Enter").defaultPrevented).toBe(false);
  expect(calls).toEqual(["page", "a", "replacement", "page"]);
  expect(kernel.commands.keymap.get().find((entry) => entry.command === "tree.open")?.enabled).toBe(
    false,
  );
});

test("DD-63: related navigation hints retain shared group labels and secondary metadata", () => {
  const { kernel, navigation } = harness();
  navigation({ onOpen() {} });
  const entries = kernel.commands.keymap.get();
  expect(
    entries
      .filter((entry) => entry.group === "tree.move")
      .map(({ command, groupLabel, legend }) => [command, groupLabel, legend]),
  ).toEqual([
    ["tree.next", "move", undefined],
    ["tree.prev", "move", undefined],
  ]);
  expect(
    entries
      .filter((entry) => entry.group === "tree.expand")
      .map(({ command, groupLabel }) => [command, groupLabel]),
  ).toEqual([
    ["tree.expand", "open, close"],
    ["tree.collapse", "open, close"],
  ]);
  expect(entries.find((entry) => entry.command === "tree.open")).toEqual(
    expect.objectContaining({ groupLabel: "open", legend: "secondary" }),
  );
});
