// @vitest-environment happy-dom
import fc from "fast-check";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { tradingPreset } from "../index.js";
import type { Kernel, NavigableTable } from "../index.js";
import { harness, press, useVirtualClock, visibleIds } from "../../test/harness.js";
import type { TestNode } from "../../test/harness.js";
import { NavigationModel } from "../../test/navigation-model.js";
import type { ModelAction } from "../../test/navigation-model.js";
import { nodesArbitrary, propertyParameters } from "../../test/navigation-generators.js";

beforeEach(useVirtualClock);
afterEach(() => vi.useRealTimers());

const keys = {
  next: "j",
  prev: "k",
  first: "Home",
  last: "End",
  pageUp: "PageUp",
  pageDown: "PageDown",
  parent: "p",
  expand: "l",
  collapse: "h",
} as const;

interface Real {
  navigation: NavigableTable<TestNode>;
  kernel: Kernel;
  notifications: number;
  open: boolean;
}

function checkState(model: NavigationModel, real: Real): void {
  expect(visibleIds(real.navigation)).toEqual(model.visible().map((node) => node.id));
  const state = real.navigation.state.get();
  expect(state.highlighted).toBe(model.cursor);
  if (state.highlighted !== null) {
    expect(model.visible()).toContainEqual(
      expect.objectContaining({ id: state.highlighted, disabled: false }),
    );
  }
  expect(
    Object.keys(state.expanded)
      .filter((id) => state.expanded !== true && state.expanded[id])
      .sort(),
  ).toEqual([...model.expanded].sort());
  const open = real.kernel.commands.keymap.get().find((entry) => entry.command === "tree.open");
  expect(open?.enabled).toBe(real.open);
}

class Navigate implements fc.Command<NavigationModel, Real> {
  constructor(readonly action: ModelAction) {}
  check = () => true;
  toString = () => keys[this.action];
  run(model: NavigationModel, real: Real): void {
    const before = real.navigation.state.get();
    const updates = real.notifications;
    const previous = JSON.stringify([model.cursor, [...model.expanded].sort()]);
    model.apply(this.action);
    press(keys[this.action]);
    checkState(model, real);
    if (JSON.stringify([model.cursor, [...model.expanded].sort()]) === previous) {
      expect(real.navigation.state.get()).toBe(before);
      expect(real.notifications).toBe(updates);
    }
    // Round-trip any expanded current branch after every step, retaining hidden expansion.
    const row = model.visible().find((node) => node.id === model.cursor);
    if (row && !row.disabled && model.expanded.has(row.id)) {
      const rows = visibleIds(real.navigation);
      real.navigation.commands.collapse();
      real.navigation.commands.expand();
      expect(visibleIds(real.navigation)).toEqual(rows);
      checkState(model, real);
    }
  }
}

class SetOpen implements fc.Command<NavigationModel, Real> {
  constructor(readonly enabled: boolean) {}
  check = () => true;
  toString = () => `onOpen=${this.enabled}`;
  run(model: NavigationModel, real: Real): void {
    real.open = this.enabled;
    real.navigation.update({ onOpen: this.enabled ? () => {} : undefined });
    checkState(model, real);
  }
}

const commandArbitraries = [
  ...Object.keys(keys).map((action) => fc.constant(new Navigate(action as ModelAction))),
  fc.boolean().map((enabled) => new SetOpen(enabled)),
];

test("seeded command sequences cannot diverge from visible cursor, expansion or no-op state", () => {
  // Happy DOM aliases AltGraph to Alt; use a plain key for parent in generated sequences.
  const { kernel, navigation } = harness({ preset: { ...tradingPreset, "tree.parent": ["P"] } });
  fc.assert(
    fc.property(
      nodesArbitrary,
      fc.boolean(),
      fc.integer({ min: 1, max: 4 }),
      fc.commands(commandArbitraries, { maxCommands: 60, size: "large" }),
      (nodes, loop, pageSize, commands) => {
        const nested = (parent: string | null): TestNode[] =>
          nodes
            .filter((node) => node.parent === parent)
            .map((node) => ({ id: node.id, disabled: node.disabled, children: nested(node.id) }));
        const controller = navigation({ data: nested(null), loop, pageSize });
        const real: Real = { navigation: controller, kernel, notifications: 0, open: false };
        const unsubscribe = controller.state.subscribe(() => {
          real.notifications++;
        });
        try {
          const model = new NavigationModel(nodes, loop, pageSize);
          checkState(model, real);
          fc.modelRun(() => ({ model, real }), commands);
        } finally {
          unsubscribe();
          controller.dispose();
        }
      },
    ),
    propertyParameters,
  );
});

test("every advertised focused-scope legend key dispatches its enabled command", () => {
  const digitKeys = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
  const { kernel } = harness({
    preset: Object.fromEntries(digitKeys.map((key, index) => [`command${index}`, [key]])),
  });
  const target = document.createElement("div");
  target.tabIndex = 0;
  document.body.append(target);
  target.focus();
  try {
    fc.assert(
      fc.property(
        fc.array(fc.record({ enabled: fc.boolean(), hidden: fc.boolean() }), {
          minLength: 1,
          maxLength: 8,
        }),
        (definitions) => {
          const calls: number[] = [];
          const release = kernel.commands.register(
            "legend",
            definitions.map((definition, index) => ({
              id: `command${index}`,
              label: `Command ${index}`,
              enabled: () => definition.enabled,
              hidden: definition.hidden,
              run: () => {
                calls.push(index);
              },
            })),
            { target },
          );
          try {
            const entries = kernel.commands.keymap
              .get()
              .filter((entry) => entry.enabled && entry.keys.length);
            expect(entries.map((entry) => entry.command)).toEqual(
              definitions.flatMap((definition, index) =>
                definition.enabled && !definition.hidden ? [`command${index}`] : [],
              ),
            );
            for (const entry of entries)
              for (const key of entry.keys) {
                const before = calls.length;
                press(key, {}, target);
                expect(calls.slice(before)).toEqual([Number(entry.command.replace("command", ""))]);
              }
          } finally {
            release();
          }
        },
      ),
      propertyParameters,
    );
  } finally {
    target.remove();
  }
});
